"""
INIT.AI Alert Engine.
Monitors LST thresholds, NDVI drops, and rate-of-rise.
Dispatches alerts via Supabase Realtime + email/SMS channels.
"""

import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from models.orm import Hotspot, Alert, Notification, Profile, City
from models.schemas import AlertCreate

logger = logging.getLogger(__name__)

# ─── Default Thresholds ───────────────────────────────────────
DEFAULT_THRESHOLDS = {
    "lst_critical":   40.0,   # °C — emergency alert
    "lst_high":       38.0,   # °C — warning alert
    "ndvi_critical":  0.05,   # NDVI — vegetation loss emergency
    "ndvi_warning":   0.10,   # NDVI — watch alert
    "rate_of_rise":   0.8,    # °C/hour — rapid warming warning
    "uhi_critical":   5.0,    # °C — UHI intensity emergency
}


class AlertEngine:
    """
    Evaluates hotspot data against thresholds and
    creates alerts + notifications for affected users.
    """

    def __init__(self, thresholds: Dict = None):
        self.thresholds = thresholds or DEFAULT_THRESHOLDS

    async def evaluate_hotspot(
        self,
        hotspot: Hotspot,
        db: AsyncSession,
        previous_lst: Optional[float] = None,
    ) -> List[Alert]:
        """
        Evaluate a single hotspot against all thresholds.
        Creates alerts and notifications for breaches.
        Returns list of newly created Alert objects.
        """
        new_alerts = []
        lst = float(hotspot.lst)
        ndvi = float(hotspot.ndvi) if hotspot.ndvi else None

        # ── LST Critical ────────────────────────────────────
        if lst >= self.thresholds["lst_critical"]:
            alert = await self._create_alert(
                db=db,
                city_id=hotspot.city_id,
                hotspot_id=hotspot.id,
                alert_type="emergency",
                title=f"CRITICAL: {hotspot.barangay_name} LST Threshold Exceeded",
                body=(
                    f"Surface temperature at {hotspot.zone_id} reached {lst:.1f}°C, "
                    f"breaching the {self.thresholds['lst_critical']}°C emergency threshold. "
                    f"Immediate ground verification and LGU response required."
                ),
                trigger_metric="lst",
                trigger_value=lst,
                threshold_value=self.thresholds["lst_critical"],
                channels=["email", "sms", "dashboard"],
            )
            new_alerts.append(alert)

        # ── LST High ────────────────────────────────────────
        elif lst >= self.thresholds["lst_high"]:
            alert = await self._create_alert(
                db=db,
                city_id=hotspot.city_id,
                hotspot_id=hotspot.id,
                alert_type="warning",
                title=f"WARNING: {hotspot.barangay_name} Elevated Temperature",
                body=(
                    f"Surface temperature at {hotspot.zone_id} is {lst:.1f}°C. "
                    f"Zone requires monitoring. Consider pre-emptive cooling measures."
                ),
                trigger_metric="lst",
                trigger_value=lst,
                threshold_value=self.thresholds["lst_high"],
                channels=["email", "dashboard"],
            )
            new_alerts.append(alert)

        # ── NDVI Critical ───────────────────────────────────
        if ndvi is not None and ndvi < self.thresholds["ndvi_critical"]:
            alert = await self._create_alert(
                db=db,
                city_id=hotspot.city_id,
                hotspot_id=hotspot.id,
                alert_type="emergency",
                title=f"CRITICAL: Vegetation Loss — {hotspot.barangay_name}",
                body=(
                    f"NDVI at {hotspot.zone_id} is {ndvi:.3f} — classified as BARE/SPARSE. "
                    f"Immediate investigation for illegal clearing recommended."
                ),
                trigger_metric="ndvi",
                trigger_value=ndvi,
                threshold_value=self.thresholds["ndvi_critical"],
                channels=["email", "dashboard"],
            )
            new_alerts.append(alert)

        # ── Rate of Rise ─────────────────────────────────────
        if previous_lst is not None:
            rate = lst - previous_lst  # assuming hourly interval
            if rate >= self.thresholds["rate_of_rise"]:
                alert = await self._create_alert(
                    db=db,
                    city_id=hotspot.city_id,
                    hotspot_id=hotspot.id,
                    alert_type="warning",
                    title=f"WARNING: Rapid Temperature Rise — {hotspot.zone_id}",
                    body=(
                        f"Temperature rising at +{rate:.1f}°C/hr at {hotspot.barangay_name}. "
                        f"Forecast to reach {lst + rate * 2:.1f}°C within 2 hours."
                    ),
                    trigger_metric="rate_of_rise",
                    trigger_value=rate,
                    threshold_value=self.thresholds["rate_of_rise"],
                    channels=["dashboard"],
                )
                new_alerts.append(alert)

        return new_alerts

    async def _create_alert(
        self,
        db: AsyncSession,
        city_id: UUID,
        hotspot_id: Optional[UUID],
        alert_type: str,
        title: str,
        body: str,
        trigger_metric: str,
        trigger_value: float,
        threshold_value: float,
        channels: List[str],
    ) -> Alert:
        """Persist alert and fan out notifications to relevant users."""
        alert = Alert(
            city_id=city_id,
            hotspot_id=hotspot_id,
            alert_type=alert_type,
            title=title,
            body=body,
            trigger_metric=trigger_metric,
            trigger_value=trigger_value,
            threshold_value=threshold_value,
            channels_sent=channels,
        )
        db.add(alert)
        await db.flush()  # get alert.id

        # Fan out to all active users in the city's LGU
        result = await db.execute(
            select(Profile).where(
                and_(Profile.is_active == True, Profile.role.in_(["Admin", "LGU Planner"]))
            )
        )
        users = result.scalars().all()

        for user in users:
            notif = Notification(
                user_id=user.id,
                alert_id=alert.id,
                title=title,
                body=body,
                notif_type=alert_type,
                channel="dashboard",
            )
            db.add(notif)

        alert.recipient_count = len(users)
        logger.info(
            f"Alert created: [{alert_type.upper()}] {title} → {len(users)} recipients"
        )

        return alert

    async def run_city_scan(
        self, city_id: UUID, db: AsyncSession
    ) -> Dict[str, Any]:
        """
        Scan all active hotspots for a city and evaluate thresholds.
        Called by the scheduled task runner every 5 minutes.
        """
        result = await db.execute(
            select(Hotspot).where(
                and_(Hotspot.city_id == city_id, Hotspot.is_active == True)
            )
        )
        hotspots = result.scalars().all()

        total_alerts = 0
        for hotspot in hotspots:
            alerts = await self.evaluate_hotspot(hotspot, db)
            total_alerts += len(alerts)

        await db.commit()

        return {
            "city_id": str(city_id),
            "hotspots_scanned": len(hotspots),
            "alerts_generated": total_alerts,
            "scan_time": datetime.utcnow().isoformat(),
        }


# Singleton
alert_engine = AlertEngine()

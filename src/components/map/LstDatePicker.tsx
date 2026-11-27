import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    formatLstDate,
    formatLstPeriod,
    isLstPeriodStart,
    shiftLstDate,
    type LstCadence,
} from './gibsLst';

interface LstDatePickerProps {
    value: string;
    minDate: string;
    maxDate: string;
    cadence: LstCadence;
    onChange: (date: string) => void;
}

interface MonthCursor {
    year: number;
    month: number;
}

interface PopoverPosition {
    top: number;
    left: number;
    width: number;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
/** Rough rendered height, used only to flip the popover near the viewport edge. */
const POPOVER_HEIGHT = 390;

function isoDate(year: number, month: number, day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function daysInMonth(year: number, month: number): number {
    return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function cursorFor(iso: string): MonthCursor {
    return { year: Number(iso.slice(0, 4)), month: Number(iso.slice(5, 7)) - 1 };
}

function addMonths(cursor: MonthCursor, delta: number): MonthCursor {
    const date = new Date(Date.UTC(cursor.year, cursor.month + delta, 1));
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}

function monthKey(cursor: MonthCursor): string {
    return `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}`;
}

function monthLabel(cursor: MonthCursor): string {
    return new Date(Date.UTC(cursor.year, cursor.month, 1)).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    });
}

function monthGrid(cursor: MonthCursor): Array<string | null> {
    const leading = new Date(Date.UTC(cursor.year, cursor.month, 1)).getUTCDay();
    const total = daysInMonth(cursor.year, cursor.month);
    const cells: Array<string | null> = Array.from({ length: leading }, () => null);
    for (let day = 1; day <= total; day += 1) {
        cells.push(isoDate(cursor.year, cursor.month, day));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
}

/**
 * Daily date control: single-day steppers plus a calendar popover. The
 * popover is portaled to the body because the map card clips overflow.
 */
export default function LstDatePicker({
    value,
    minDate,
    maxDate,
    cadence,
    onChange,
}: LstDatePickerProps) {
    const [open, setOpen] = useState(false);
    const [view, setView] = useState<MonthCursor>(() => cursorFor(value));
    const [position, setPosition] = useState<PopoverPosition | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const selectedRef = useRef<HTMLButtonElement>(null);

    const weekly = cadence === 'weekly';
    const formatValue = weekly ? formatLstPeriod : formatLstDate;
    const stepDays = weekly ? 8 : 1;
    const previousValue = shiftLstDate(value, -stepDays);
    const nextValue = shiftLstDate(value, stepDays);
    const canGoPrevious = value > minDate;
    const canGoNext = value < maxDate;
    const valueLabel = formatValue(value);
    const noun = weekly ? 'week' : 'date';

    const cells = monthGrid(view);
    const canGoPreviousMonth = monthKey(view) > minDate.slice(0, 7);
    const canGoNextMonth = monthKey(view) < maxDate.slice(0, 7);

    function close() {
        setOpen(false);
    }

    function openCalendar() {
        setView(cursorFor(value));
        setOpen(true);
    }

    useLayoutEffect(() => {
        if (!open) {
            setPosition(null);
            return;
        }

        function place() {
            const trigger = triggerRef.current;
            if (!trigger) return;
            const rect = trigger.getBoundingClientRect();
            const width = Math.min(320, window.innerWidth - 24);
            const left = Math.min(
                Math.max(12, rect.left + rect.width / 2 - width / 2),
                window.innerWidth - width - 12,
            );
            const below = rect.bottom + 8;
            const top =
                below + POPOVER_HEIGHT > window.innerHeight - 12
                    ? Math.max(12, rect.top - POPOVER_HEIGHT - 8)
                    : below;
            setPosition({ top, left, width });
        }

        place();
        window.addEventListener('resize', place);
        window.addEventListener('scroll', close, true);
        return () => {
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', close, true);
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;

        function onPointerDown(event: PointerEvent) {
            const target = event.target as Node;
            if (
                popoverRef.current?.contains(target) ||
                triggerRef.current?.contains(target)
            ) {
                return;
            }
            close();
        }

        function onKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') close();
        }

        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const frame = window.requestAnimationFrame(() => selectedRef.current?.focus());
        return () => window.cancelAnimationFrame(frame);
    }, [open]);

    return (
        <>
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/[.04]">
                <button
                    type="button"
                    aria-label={`Previous ${noun}`}
                    title={
                        canGoPrevious
                            ? `Previous ${noun} · ${formatValue(previousValue)}`
                            : 'No earlier date in range'
                    }
                    disabled={!canGoPrevious}
                    onClick={() => onChange(previousValue)}
                    className="flex h-[34px] w-[30px] cursor-pointer items-center justify-center rounded-l-full border-none bg-transparent text-[#ccc] transition hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                >
                    <i className="fa-solid fa-chevron-left text-[10px]"></i>
                </button>

                <button
                    ref={triggerRef}
                    type="button"
                    aria-haspopup="dialog"
                    aria-expanded={open}
                    aria-label={`Choose ${noun}, currently ${valueLabel}`}
                    title={`Choose a ${noun}`}
                    onClick={() => (open ? close() : openCalendar())}
                    className="flex h-[34px] min-w-[146px] cursor-pointer items-center justify-center gap-1.5 border-none bg-transparent px-1 text-[11.5px] font-medium tabular-nums text-[#ddd] transition hover:text-white focus:outline-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/35"
                >
                    <i className="fa-regular fa-calendar-days text-[11px] text-[#999]"></i>
                    <span>{valueLabel}</span>
                    <i
                        className={`fa-solid fa-chevron-down text-[8px] text-[#777] transition-transform ${
                            open ? 'rotate-180' : ''
                        }`}
                    ></i>
                </button>

                <button
                    type="button"
                    aria-label={`Next ${noun}`}
                    title={
                        canGoNext
                            ? `Next ${noun} · ${formatValue(nextValue)}`
                            : 'No later date in range'
                    }
                    disabled={!canGoNext}
                    onClick={() => onChange(nextValue)}
                    className="flex h-[34px] w-[30px] cursor-pointer items-center justify-center rounded-r-full border-none bg-transparent text-[#ccc] transition hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                >
                    <i className="fa-solid fa-chevron-right text-[10px]"></i>
                </button>
            </div>

            {open && position
                ? createPortal(
                      <div
                          ref={popoverRef}
                          role="dialog"
                          aria-label="Choose LST date"
                          className="fixed z-[80] rounded-[16px] border border-white/12 bg-[rgba(18,18,22,.98)] p-3 shadow-[0_24px_64px_rgba(0,0,0,.65)] backdrop-blur-xl"
                          style={{
                              top: position.top,
                              left: position.left,
                              width: position.width,
                          }}
                      >
                          <div className="flex items-center justify-between gap-2">
                              <button
                                  type="button"
                                  aria-label="Previous month"
                                  disabled={!canGoPreviousMonth}
                                  onClick={() => setView(addMonths(view, -1))}
                                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-[10px] text-[#aaa] transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                              >
                                  <i className="fa-solid fa-chevron-left"></i>
                              </button>
                              <span
                                  aria-live="polite"
                                  className="text-[12px] font-semibold text-[#f1f1f2]"
                              >
                                  {monthLabel(view)}
                              </span>
                              <button
                                  type="button"
                                  aria-label="Next month"
                                  disabled={!canGoNextMonth}
                                  onClick={() => setView(addMonths(view, 1))}
                                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-[10px] text-[#aaa] transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                              >
                                  <i className="fa-solid fa-chevron-right"></i>
                              </button>
                          </div>

                          <div className="mt-2 grid grid-cols-7 gap-1">
                              {WEEKDAYS.map((day) => (
                                  <span
                                      key={day}
                                      className="py-1 text-center text-[9.5px] font-semibold uppercase tracking-[.08em] text-[#8a8a92]"
                                  >
                                      {day}
                                  </span>
                              ))}
                              {cells.map((date, index) => {
                                  if (!date) {
                                      return (
                                          <span
                                              key={`empty-${index}`}
                                              aria-hidden="true"
                                          ></span>
                                      );
                                  }

                                  const latestPeriodEnd = weekly
                                      ? shiftLstDate(maxDate, 7)
                                      : maxDate;
                                  const inRange =
                                      date >= minDate && date <= latestPeriodEnd;
                                  const isPeriodStart = !weekly || isLstPeriodStart(date);
                                  const available = inRange && isPeriodStart;
                                  const selected = date === value;
                                  const title = !inRange
                                      ? date > latestPeriodEnd
                                          ? 'Not processed yet'
                                          : 'Outside the recent 90-day window'
                                      : !isPeriodStart
                                        ? '8-day period starts only'
                                        : formatLstDate(date);

                                  return (
                                      <button
                                          key={date}
                                          ref={selected ? selectedRef : undefined}
                                          type="button"
                                          disabled={!available}
                                          aria-label={formatLstDate(date)}
                                          aria-current={selected ? 'date' : undefined}
                                          title={title}
                                          onClick={() => {
                                              onChange(date);
                                              close();
                                          }}
                                          className={`mx-auto flex h-8 w-8 cursor-pointer items-center justify-center rounded-[9px] border-none text-[11.5px] tabular-nums transition ${
                                              selected
                                                  ? 'bg-accent font-semibold text-white shadow-[0_0_0_1px_rgba(255,255,255,.18)]'
                                                  : available
                                                    ? 'bg-transparent text-[#e8e8ea] hover:bg-white/10 hover:text-white'
                                                    : 'cursor-not-allowed bg-transparent text-[#5a5a62]'
                                          }`}
                                      >
                                          {Number(date.slice(8, 10))}
                                      </button>
                                  );
                              })}
                          </div>

                          <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/8 pt-2">
                              <span className="text-[10.5px] text-[#8a8a92]">
                                  Latest: {formatValue(maxDate)}
                              </span>
                              <button
                                  type="button"
                                  onClick={() => {
                                      onChange(maxDate);
                                      close();
                                  }}
                                  className="cursor-pointer border-none bg-transparent text-[11px] font-semibold text-accent transition hover:text-white"
                              >
                                  Latest
                              </button>
                          </div>
                          <p className="m-0 mt-1 text-[9.5px] leading-snug text-[#777]">
                              {weekly
                                  ? 'UTC dates · 8-day period starts only · not hourly.'
                                  : 'UTC dates · recent 90 days · daily passes, not hourly.'}
                          </p>
                      </div>,
                      document.body,
                  )
                : null}
        </>
    );
}

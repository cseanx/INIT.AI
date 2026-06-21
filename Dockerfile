FROM python:3.11-slim

# System deps for rasterio, geopandas, WeasyPrint
RUN apt-get update && apt-get install -y \
    gdal-bin libgdal-dev \
    libgeos-dev libproj-dev \
    libpango-1.0-0 libpangocairo-1.0-0 \
    libcairo2 libffi-dev \
    gcc g++ git \
    && rm -rf /var/lib/apt/lists/*

ENV GDAL_CONFIG=/usr/bin/gdal-config
ENV CPLUS_INCLUDE_PATH=/usr/include/gdal
ENV C_INCLUDE_PATH=/usr/include/gdal

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

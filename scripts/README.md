# Script para Poblar Datos de US Counties y Cities

## Configuración

1. Instalar dependencias:
```bash
pip install -r requirements.txt
```

2. Configurar variable de entorno con el service key de Supabase:
```bash
export SUPABASE_SERVICE_KEY="tu_service_key_aqui"
```

3. Verificar archivos CSV:
   - Los archivos deben estar en `public/lovable-uploads/`:
     - `uscounties.csv`
     - `uscities.csv`

## Ejecución

```bash
python populate_us_data.py
```

## Notas

- El script usa `upsert` para evitar duplicados
- Procesa los datos en lotes de 1000 registros para eficiencia
- Los condados se insertan primero, luego las ciudades se relacionan con sus condados
- Si una ciudad no puede relacionarse con un condado, se inserta con `county_id = NULL`

## Estructura esperada de CSV

### us-counties.csv
- `county`: Nombre del condado
- `state_id`: Código de estado de 2 letras
- `county_fips`: Código FIPS del condado

### us-cities.csv  
- `city`: Nombre de la ciudad
- `state_id`: Código de estado de 2 letras
- `county_name`: Nombre del condado
- `lat`: Latitud
- `lng`: Longitud
- `population`: Población
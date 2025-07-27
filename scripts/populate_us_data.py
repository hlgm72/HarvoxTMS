#!/usr/bin/env python3
"""
Script para poblar las tablas us_counties y us_cities desde archivos CSV de SimpleMaps
"""

import pandas as pd
import os
from supabase import create_client, Client
from typing import Dict, Any

# Configuración de Supabase
SUPABASE_URL = "https://htaotttcnjxqzpsrqwll.supabase.co"
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")  # Necesitas configurar esta variable

def get_supabase_client() -> Client:
    """Crear cliente de Supabase con service key para operaciones admin"""
    if not SUPABASE_SERVICE_KEY:
        raise ValueError("SUPABASE_SERVICE_KEY environment variable is required")
    
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def read_csv_file(file_path: str) -> pd.DataFrame:
    """Leer archivo CSV local"""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Archivo CSV no encontrado: {file_path}")
    return pd.read_csv(file_path)

def populate_counties(supabase: Client, counties_df: pd.DataFrame) -> Dict[str, Any]:
    """Poblar tabla us_counties"""
    print("Poblando us_counties...")
    
    # Preparar datos para inserción
    counties_data = []
    for _, row in counties_df.iterrows():
        county_data = {
            "county_name": row["county"],
            "state_id": row["state_id"],  # Asumiendo que el CSV tiene state_id (código de 2 letras)
            "fips_code": str(row["county_fips"]).zfill(5) if pd.notna(row["county_fips"]) else None
        }
        counties_data.append(county_data)
    
    # Insertar en lotes para eficiencia
    batch_size = 1000
    total_inserted = 0
    
    for i in range(0, len(counties_data), batch_size):
        batch = counties_data[i:i + batch_size]
        try:
            result = supabase.table("us_counties").upsert(
                batch,
                on_conflict="county_name,state_id"
            ).execute()
            total_inserted += len(batch)
            print(f"Insertados {total_inserted}/{len(counties_data)} condados...")
        except Exception as e:
            print(f"Error insertando lote {i//batch_size + 1}: {e}")
            continue
    
    return {"total_counties": len(counties_data), "inserted": total_inserted}

def populate_cities(supabase: Client, cities_df: pd.DataFrame) -> Dict[str, Any]:
    """Poblar tabla us_cities"""
    print("Poblando us_cities...")
    
    # Obtener mapeo de condados para relacionar ciudades
    counties_response = supabase.table("us_counties").select("id,county_name,state_id").execute()
    counties_map = {}
    for county in counties_response.data:
        key = f"{county['county_name']}_{county['state_id']}"
        counties_map[key] = county["id"]
    
    # Preparar datos para inserción
    cities_data = []
    missing_counties = set()
    
    for _, row in cities_df.iterrows():
        # Buscar condado correspondiente
        county_key = f"{row['county_name']}_{row['state_id']}"
        county_id = counties_map.get(county_key)
        
        if not county_id:
            missing_counties.add(county_key)
            # Continuar sin county_id (puede ser None)
        
        city_data = {
            "city_name": row["city"],
            "state_id": row["state_id"],
            "county_id": county_id,
            "latitude": float(row["lat"]) if pd.notna(row["lat"]) else None,
            "longitude": float(row["lng"]) if pd.notna(row["lng"]) else None,
            "population": int(row["population"]) if pd.notna(row["population"]) and row["population"] != "" else None
        }
        cities_data.append(city_data)
    
    if missing_counties:
        print(f"Advertencia: {len(missing_counties)} condados no encontrados")
        print(f"Primeros 10: {list(missing_counties)[:10]}")
    
    # Insertar en lotes
    batch_size = 1000
    total_inserted = 0
    
    for i in range(0, len(cities_data), batch_size):
        batch = cities_data[i:i + batch_size]
        try:
            result = supabase.table("us_cities").upsert(
                batch,
                on_conflict="city_name,state_id"
            ).execute()
            total_inserted += len(batch)
            print(f"Insertadas {total_inserted}/{len(cities_data)} ciudades...")
        except Exception as e:
            print(f"Error insertando lote {i//batch_size + 1}: {e}")
            continue
    
    return {
        "total_cities": len(cities_data), 
        "inserted": total_inserted,
        "missing_counties": len(missing_counties)
    }

def main():
    """Función principal"""
    # Rutas de los archivos CSV locales
    COUNTIES_CSV_PATH = "../public/lovable-uploads/uscounties.csv"
    CITIES_CSV_PATH = "../public/lovable-uploads/uscities.csv"
    
    try:
        # Crear cliente Supabase
        supabase = get_supabase_client()
        print("Conectado a Supabase")
        
        # Leer archivos CSV locales
        print("Leyendo archivos CSV...")
        counties_df = read_csv_file(COUNTIES_CSV_PATH)
        cities_df = read_csv_file(CITIES_CSV_PATH)
        
        print(f"Condados CSV: {len(counties_df)} filas")
        print(f"Ciudades CSV: {len(cities_df)} filas")
        
        # Poblar condados primero
        counties_result = populate_counties(supabase, counties_df)
        print(f"Condados procesados: {counties_result}")
        
        # Poblar ciudades
        cities_result = populate_cities(supabase, cities_df)
        print(f"Ciudades procesadas: {cities_result}")
        
        print("¡Proceso completado exitosamente!")
        
    except Exception as e:
        print(f"Error en el proceso: {e}")
        raise

if __name__ == "__main__":
    main()
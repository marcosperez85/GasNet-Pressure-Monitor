import pandas as pd
import json
from pathlib import Path

# ============================================================
# Configuración
# ============================================================

INPUT_CSV = Path("../data/resultados_predicciones.csv")
OUTPUT_JSON = Path("../data/dataset_2022-2025.json")

CSV_SEPARATOR = ";"

UPSTREAM_POINT_ID = "PM_203_El_Chourron_P_Entrada"
DOWNSTREAM_POINT_ID = "ERP_Invernada_L3_P_Entrada"
PREDICTION_HORIZON_HOURS = 48

# ============================================================
# Cargar dataset CSV
# ============================================================

df = pd.read_csv(INPUT_CSV, sep=CSV_SEPARATOR)

# ============================================================
# Transformar a JSON semántico (POC-friendly)
# ============================================================

json_records = []

for _, row in df.iterrows():
    record = {
        "timestamp": pd.to_datetime(row["Timestamp"]).isoformat(),

        "upstream_point": {
            "id": UPSTREAM_POINT_ID,
            "value": row["PM_203_El_Chourron_P_Entrada"]
        },

        "downstream_point": {
            "id": DOWNSTREAM_POINT_ID,
            "value": row["ERP_Invernada_L3_P_Entrada"]
        },

        "prediction": {
            "horizon_hours": PREDICTION_HORIZON_HOURS,
            "value": row["target_deltaP_48hs"]
        },

        "linepack_state": row.get("linepack_state", None)
    }

    json_records.append(record)

# ============================================================
# Guardar JSON para subir a S3
# ============================================================

with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
    json.dump(json_records, f, ensure_ascii=False, indent=4)

print(f"\nArchivo JSON creado exitosamente en '{OUTPUT_JSON}'")

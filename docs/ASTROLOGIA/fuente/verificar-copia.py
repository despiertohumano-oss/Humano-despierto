#!/usr/bin/env python3
"""Falla si algun texto de data/posiciones/*.json repite 8+ palabras seguidas del material original.

Uso (desde la raiz del repo):
  python3 -I docs/ASTROLOGIA/fuente/verificar-copia.py [planeta ...] [--material DIR]
Sin planetas revisa los 10. Si el material no esta, avisa y sale 0.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

N = 8
PLANETAS = ["sol", "luna", "mercurio", "venus", "marte", "jupiter", "saturno", "urano", "neptuno", "pluton"]
RAIZ = Path(__file__).resolve().parents[3]
POS = RAIZ / "webApp/src/lib/astro/data/posiciones"


def palabras(texto):
    return re.findall(r"[a-záéíóúüñ0-9]+", texto.lower())


def ngramas(ws):
    return {" ".join(ws[i:i + N]) for i in range(len(ws) - N + 1)}


def main():
    args = sys.argv[1:]
    material = RAIZ / "docs/ASTROLOGIA"
    if "--material" in args:
        i = args.index("--material")
        material = Path(args[i + 1])
        del args[i:i + 2]
    planetas = args or PLANETAS
    docs = [p for p in material.rglob("*") if p.suffix.lower() in (".docx", ".doc") and not p.name.startswith("~$")] if material.exists() else []
    if not docs:
        print(f"AVISO: no hay material en {material}; no se pudo comparar.")
        return 0
    originales = set()
    for d in docs:
        try:
            out = subprocess.run(["textutil", "-convert", "txt", "-stdout", str(d)], capture_output=True, text=True, check=True).stdout
        except (OSError, subprocess.CalledProcessError):
            print(f"AVISO: no se pudo leer {d.name}")
            continue
        originales |= ngramas(palabras(out))
    fallas = 0
    for p in planetas:
        data = json.loads((POS / f"{p}.json").read_text(encoding="utf-8"))
        for grupo in ("en_signo", "en_casa"):
            for clave, e in data[grupo].items():
                for campo in ("texto", "luz", "sombra"):
                    comunes = ngramas(palabras(e[campo])) & originales
                    if comunes:
                        fallas += 1
                        print(f"COPIA {p}/{grupo}/{clave}/{campo}: {sorted(comunes)[0]!r}")
    print(f"{fallas} coincidencias de {N}+ palabras en {len(planetas)} planetas")
    return 1 if fallas else 0


sys.exit(main())

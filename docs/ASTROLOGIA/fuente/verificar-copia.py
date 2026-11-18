#!/usr/bin/env python3
"""Falla si algun texto de data/posiciones/*.json repite 8+ palabras seguidas del material original.

Uso (desde la raiz del repo):
  python3 -I docs/ASTROLOGIA/fuente/verificar-copia.py [planeta ...] [--material DIR]
Sin planetas revisa los 10. Si el material no esta, avisa y sale 0.
Compara en NFC y sin acentos. Lee solo .docx/.doc con textutil: los PDF no se leen.
Si textutil falla o no devuelve texto de un documento, sale con codigo 2 nombrandolo.
"""
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

N = 8
PLANETAS = ["sol", "luna", "mercurio", "venus", "marte", "jupiter", "saturno", "urano", "neptuno", "pluton"]
RAIZ = Path(__file__).resolve().parents[3]
POS = RAIZ / "webApp/src/lib/astro/data/posiciones"


def sin_acentos(texto):
    nfd = unicodedata.normalize("NFD", unicodedata.normalize("NFC", texto))
    return "".join(c for c in nfd if unicodedata.category(c) != "Mn")


def palabras(texto):
    return re.findall(r"[a-z0-9]+", sin_acentos(texto).lower())


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
    todos = [p for p in material.rglob("*") if p.is_file() and not p.name.startswith("~$")] if material.exists() else []
    docs = [p for p in todos if p.suffix.lower() in (".docx", ".doc")]
    pdfs = [p for p in todos if p.suffix.lower() == ".pdf"]
    if not docs:
        print(f"AVISO: no hay material en {material}; no se pudo comparar.")
        return 0
    if pdfs:
        print(f"AVISO: {len(pdfs)} PDF no se leen (solo .docx/.doc); su texto no entra en la comparacion.")
    originales = set()
    for d in docs:
        try:
            r = subprocess.run(["textutil", "-convert", "txt", "-stdout", str(d)], capture_output=True, text=True, check=True)
            out = r.stdout
        except (OSError, subprocess.CalledProcessError) as err:
            print(f"ERROR: textutil no pudo leer {d}: {err}")
            return 2
        # textutil sale con 0 aunque no pueda abrir el archivo: el error solo aparece en stderr.
        if not out.strip() or "Error reading" in r.stderr:
            print(f"ERROR: textutil no devolvio texto de {d}: {r.stderr.strip()}")
            return 2
        originales |= ngramas(palabras(out))
    print(f"{len(docs)} documentos .docx/.doc leidos")
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

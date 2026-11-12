# CUE AI

Plugin pro lokální Codex a Claude Code, verze 1.0.0.

| MCP server | Adresa | Použití |
| --- | --- | --- |
| `cvc` | `http://127.0.0.1:8765/mcp` | CUE Visual Composer na tomto počítači |
| `cue-docs` | `https://www.cuesystem.com/docs-mcp` | Dokumentace CUE |

Plugin připojuje existující servery; neinstaluje ani nespouští CVC server.
CVC musí běžet se zapnutým MCP na portu 8765 na stejném počítači jako klient.
Adresa 127.0.0.1 v kontejneru, WSL nebo vzdálené relaci označuje dané prostředí.
Pro uvedené adresy používejte klienta přímo ve Windows. Dokumentace potřebuje internet.

## Obsah

- `skills/cue-visual-composer/`: skill, reference a Node.js nástroje z `CVC-Project-Skills.zip`.
- `skills/archive/`: původní experimentální skripty a projekty. Nejde o další skill.
  Umístění zachovává relativní odkazy z `references/ARCHIVE.md` a importy mezi skripty.
- `plugin.json` a `mcp.json`: přenosný formát pro Codex.
- `.codex-plugin/plugin.json`: kompatibilní manifest pro Codex.
- `.claude-plugin/plugin.json` a `.mcp.json`: formát pro Claude Code.

Celý obsah vstupního ZIP je zachován beze změn, pouze jeho kořen
`CVC Project Skills/` je přemístěn pod `skills/`. Archivované programy se automaticky
nespouštějí; mohou obsahovat původní absolutní cesty. Před použitím je přečtěte.
Node.js 18+ je potřeba pro pomocné `.mjs` skripty; samotná MCP spojení Node.js nepotřebují.

## Claude Code bez instalace

Po rozbalení pluginu spusťte v PowerShellu:

```powershell
claude --plugin-dir 'C:\cesta\cue-ai'
```

V relaci ověřte připojení příkazem `/mcp`. Skill vyvolejte jako
`/cue-ai:cue-visual-composer` nebo zadáním práce na CVC projektu.

## Codex

Pro instalaci přes lokální marketplace použijte celý zdrojový projekt a postup
v jeho kořenovém `README.md`. ZIP samotného pluginu neobsahuje marketplace.
Po instalaci otevřete nový chat s pluginem CUE AI a ověřte dostupnost nástrojů.
Přítomnost manifestů ani úspěšný test endpointů sama nepotvrzuje instalaci v klientovi.

## Ověření připojení

Ve zdrojovém projektu je `scripts/check-mcp.mjs`. Testuje inicializaci a seznam
nástrojů obou endpointů a provede čtení informací o CVC a vyhledání v dokumentaci.
Neotevírá ani neupravuje CVC projekt.

Balíček neobsahuje přihlašovací údaje. Při případném požadavku serveru na
autentizaci dokončete přihlášení v klientovi.

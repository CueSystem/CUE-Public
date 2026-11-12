# CUE AI Plugin — instalace a údržba

Plugin **CUE AI** pro Codex a Claude Code. Připojuje CVC na
`http://127.0.0.1:8765/mcp` a dokumentaci na `https://www.cuesystem.com/docs-mcp`.
Obsahuje skill `cue-visual-composer` a kompletní podpůrné soubory ze vstupního
archivu `CVC-Project-Skills.zip`.

Plugin je ve složce `plugins/cue-ai`. Instalační ZIP bude v `dist/cue-ai-1.0.0.zip`.
Podrobnosti a předpoklady jsou v [README pluginu](plugins/cue-ai/README.md).

## Instalace přímo z GitHubu

Codex:

```powershell
codex plugin marketplace add https://github.com/CueSystem/CUE-Public.git
```

Poté nainstalujte CUE AI ze zdroje CUE AI v nabídce Plugins a otevřete nový chat.

Claude Code:

```powershell
claude plugin marketplace add CueSystem/CUE-Public
claude plugin install cue-ai@cue-ai-local
```

## Codex z lokálního checkoutu

V PowerShellu z kořene tohoto projektu zaregistrujte marketplace:

```powershell
codex plugin marketplace add .
```

V Codex otevřete nabídku Plugins, vyberte zdroj **CUE AI** (`cue-ai-local`)
a nainstalujte **CUE AI**. Pokud se zdroj ještě nezobrazuje, restartujte aplikaci.
Potom založte nový chat a vyberte plugin CUE AI.
Projekt poskytuje `.agents/plugins/marketplace.json` a kompatibilní manifest.

## Claude Code

Z kořene tohoto projektu:

```powershell
claude plugin marketplace add .
claude plugin install cue-ai@cue-ai-local
```

Po spuštění nové relace ověřte servery přes `/mcp` a použijte
`/cue-ai:cue-visual-composer`.

Pro jednorázové načtení bez instalace:

```powershell
claude --plugin-dir './plugins/cue-ai'
```

## Kontrola a balení

```powershell
node scripts/validate-plugin.mjs
node scripts/check-mcp.mjs
./scripts/package.ps1
```

Validátor kontroluje manifesty, konzistenci endpointů, skill a úplnost souborů
ze zdrojového archivu podle uložených SHA-256. Kontrola MCP provádí pouze čtení.
Balicí skript používá .NET ZIP API, aby zahrnul i skryté adresáře manifestů.

## Zdroje formátů

- [OpenAI: balení pluginů](https://developers.openai.com/plugins/build/plugins)
- [Claude Code: manifest pluginu](https://code.claude.com/docs/en/plugins-reference)
- [Claude Code: lokální marketplace](https://code.claude.com/docs/en/plugin-marketplaces)

Připojení k existujícím serverům nevyžaduje nasazení nového serveru ani publikování
pluginu do veřejného katalogu. Tento projekt automaticky nemění uživatelskou konfiguraci.

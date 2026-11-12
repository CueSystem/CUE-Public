# CUE-Public
Public repository for CUE, a.s.

## CUE AI plugin

**Začínáte? [Český návod: instalace Codexu a přidání CUE AI ve Windows](docs/INSTALACE-CODEX-CUE-AI.cs.md).**

Plugin pro **Codex a Claude Code**, připojující CUE Visual Composer a dokumentaci CUE.
Obsahuje skill `cue-visual-composer` včetně referencí, skriptů a ukázkových projektů
z archivu `CVC-Project-Skills.zip`.

| Server | Endpoint |
| --- | --- |
| CUE Visual Composer | `http://127.0.0.1:8765/mcp` |
| CUE Docs | `https://www.cuesystem.com/docs-mcp` |

### Codex

```powershell
codex plugin marketplace add https://github.com/CueSystem/CUE-Public.git
```

V aplikaci otevřete Plugins, vyberte marketplace **CUE AI** (`cue-ai-local`)
a nainstalujte **CUE AI**. Potom otevřete nový chat s tímto pluginem.

### Claude Code

```powershell
claude plugin marketplace add CueSystem/CUE-Public
claude plugin install cue-ai@cue-ai-local
```

V nové relaci zkontrolujte servery přes `/mcp` a vyvolejte
`/cue-ai:cue-visual-composer`.

### Předpoklady a ověření

CVC musí běžet na stejném počítači jako klient a poskytovat MCP na portu 8765.
Plugin tento server nespouští. Dokumentační server potřebuje internet.
Pomocné skripty vyžadují Node.js 18+.

```powershell
node scripts/validate-plugin.mjs
node scripts/check-mcp.mjs
./scripts/package.ps1
```

První příkaz ověří manifesty a SHA-256 všech 94 importovaných souborů.
Druhý provede MCP inicializaci, načtení seznamu nástrojů a volání pouze pro čtení
na obou serverech. Poslední vytvoří a ověří `dist/cue-ai-1.0.0.zip`.
GitHub Actions provádí kontrolu souborů a sestavení ZIP; živý CVC na počítači
uživatele se v hostovaném CI netestuje.

ZIP ke stažení je také součástí artefaktu úspěšného běhu
[workflow Plugin package](https://github.com/CueSystem/CUE-Public/actions/workflows/plugin.yml).
Stažení artefaktů GitHub Actions může vyžadovat přihlášení ke GitHubu.

Podrobnosti: [instalace a údržba](PLUGIN-INSTALL.md),
[obsah pluginu](plugins/cue-ai/README.md).

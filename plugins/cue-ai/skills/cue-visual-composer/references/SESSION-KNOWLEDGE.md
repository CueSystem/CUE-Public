# Session knowledge — 2026-11-07

This is a curated record of the available chat and local artifacts, not a verbatim chat export. Earlier assistant outputs were not all available; do not infer missing confirmations.

## Environment and tooling

CVC Data: C:/Program Files/CUE/CUE Visual Composer/Data. Work originated in Documents/ChatGPT/CUE Docs/cvc-driver-mcp and continued in Documents/ChatGPT/CVC MCP. Node is available through the Codex runtime. No Python executable was available on PATH during packaging.

Local stdio MCP prototype server.mjs provides create_relay_driver and generates a .cvcd; it does not import into a live CVC project. Earlier GUI import was reported successful. No automated CVC compiler integration was established.

## Project evolution

FirstAIproject was built as a fresh CVCP from installed definitions. It contains TouchPanel1 and TouchPanel2 (touchCUE-10-W), SmartRelay1, SamsungMonitor1, and in v05/v06 ControlBasic1 plus Keypad1/CUEwireBus1.

Home, AV, Lights and HVAC pages are identical on both touch panels; navigation is independent. AV has 11 Samsung input buttons and power on/off. Lights has two relay circuits on SmartRelay1 RE1/RE2 plus a 0–100 dimmer UI. HVAC is only a placeholder. No actual dimmer was specified: SharedDimmerLevel is a requested software state, with DimmerLevelRequested for future integration.

RelayControl owns relays and shared dimming state and publishes Events. AVService on TouchPanel1 owns the sole Samsung TCP connection. SamsungControls on each panel updates local input selection immediately and publishes InputPressed. A peer event updates the other panel. In v04 driver dispatch is combined with the one allowed receiving event handler on TouchPanel1.

## Known failures and confidence

- v01/v02: publishing input events after driver calls caused a clear dependency on TCP delays; even v03 did not have a demonstrated latency improvement.
- v03: user supplied compiler error 2000150, link is used more than once, in AVService. Both AVService and SamsungControls subscribed to TouchPanel2.SamsungControls.InputPressed on TouchPanel1. v04 removed duplicated handlers; compilation of v04 was not confirmed.
- TwoStatePushButton uses SetStateDown/SetStateUp; active input green, inactive blue. Runtime SetUpColor/SetDownColor were added to make colors explicit. User-observed color and latency problems were not confirmed resolved on hardware or simulator.
- Samsung SendCommand takes a semaphore, may retry connection three times, and returns True even when retry send fails. Default IP is 127.0.0.1 and port 1515 unless overridden. Real monitor IP remained unspecified.
- v05 added controlCUE-basic, keypadCUE-55 and RS485ToCUEwire. User reported keypad and connector not linked. v06 changed the serialized connector text from one line to the exact multiline style found in HouseNechanice. This is a proposed correction, not user-verified success.
- v04 through v06 were statically checked for unique links per unit, CRC and binary roundtrip; no successful CVC compile was observed for these versions.
- Several later versions used generated predecessors when the desktop file was locked, with disclosure. They may omit user edits made in CVC after those predecessors.

## Keypad and controller

controlCUE-basic_CS0552_Firmware_21.70.cvcc declares KEYPAD1 As _Serial. keypadCUE-55_4.14.cvcd requires CUEwireConnector and has Button1 through Button8 with OnPush events and LEDOn/LEDOff methods. Address defaults to 2. RS485ToCUEwire_4.12.cvcd requires RS485Connector and exposes Public Channel CUEwireConnector As CUEwire. It sets RS485, 38400 baud, 8 data bits, no parity, one stop bit, no flow control.

Connections intended in v06:

```
MyConnectors
{
RS485Connector:= MyProject.ControlBasic1.KEYPAD1}
MyProperties
{
}
```

```
MyConnectors
{
CUEwireConnector:= MyProject.CUEwireBus1.CUEwireConnector}
MyProperties
{
Address:=2}
```

This bridge is software protocol handling, not an additional physical converter. Directly assigning _Serial to the keypad's CUEwireConnector would mismatch types. Eliminating the visible bridge requires a new integrated driver, not simply deleting the bridge reference.

Keypad assignment: 1 power on, 2 power off, 3 previous input, 4 next input, 5 toggle RE1, 6 toggle RE2, 7 dim −10%, 8 dim +10%. Relay toggles read actual relay state; dim adjustment clamps 0–100. LEDs 5/6 follow relay Events; 7/8 indicate adjustment availability. Physical CUEwire address and network IPs must match project configuration.

## Driver catalog

Catalog: https://resources.cuesystem.com/api/cuevisualcomposer/devices/load/
Files: https://resources.cuesystem.com/api/CueVisualComposer/devices/files/
Community catalog: /api/cuevisualcomposer/communitydevices/load/

Catalog requires token; request with majorversion=24 and minorversion=0 returned 645 items on 2026-11-07. Fields include manufacturer/model/type/connection/version/file/url. Saved JSON has token stripped. Installed EXE contains its client token next to the UTF16LE endpoint string. Retrieve locally only as needed; no token is embedded in this portable skill. Node fetch worked when Windows curl/Invoke-WebRequest had TLS credential errors.

Selected Samsung driver: SamsungDisplay_Generic TCP Client 2.28. Inputs: VGA, DVI, HDMI1, HDMI2, Component, BNC, Composite, Svideo, DisplayPort, MagicInfoLite, MagicInfo. Input confirmation feedback was not implemented in the driver; distinguish last requested input from actual input.

## Other work

HouseNechanice was a reference for binary framing, not a template to copy into new user projects. Do not distribute its raw extracted texts: they may contain installation-specific credentials.

CoreGraphicLibrary_1.00 (1).cvcp was a separate task: all six pages changed to green, 114 used texts received Czech variants (language ID32), 200 runtime text refresh calls were generated, and Czech/original-language buttons were placed on CdPage. Default Czech; no English translation was created. Debug drawing of DDDDD was removed. Structural checks passed, CVC compile was not observed.

_CallDelayed semantics were discussed earlier but no reliable complete answer is retained here. Consult actual CUE documentation rather than reconstructing an API from the chat title.

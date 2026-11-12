---
name: cue-visual-composer
description: Inspect and modify CUE Visual Composer CVCP projects, import CUE libraries and drivers, and implement XPL2 user interfaces and event synchronization. Use for CVC project work; binary validation alone does not establish CVC compilation or hardware operation.
---

# CUE Visual Composer project work

Read [session knowledge](references/SESSION-KNOWLEDGE.md) before changing an existing project. Read [CVCP format](references/CVCP-FORMAT.md) for serialization and [installed libraries](references/DATA-LIBRARY.md) for component extraction.

Use `scripts/inspect-project.mjs` and its adjacent `driver.mjs` for parsing and CRC-preserving serialization. Preserve unknown fields and opaque payloads. Update payload bytes, not just cached node.text. A new tag-3 node should have both payload and text when later code searches it by name.

Read the current user file before editing. If CVC locks it, ask the user to save and close. Do not silently use a stale generated copy. A separate version from a known older artifact is acceptable only with explicit disclosure and an appropriate user scope. Back up before overwriting; check that the input hash has not changed.

Use the installed library's actual connector types, methods, property names and event signatures. Importing a resource is not the same as creating and connecting a device instance. Serialize MyConnectors/MyProperties in the multiline style of working projects; the single-line experiment failed to show connections and the multiline correction has not yet been confirmed by the user.

Check duplicate Link targets per receiving unit across all modules. Normalize local and fully qualified references. Do not attach two subscribers to the same event within one unit; consolidate the handler.

For responsive input selection, update local UI in the button event and publish a peer Event before starting driver work. Keep TCP out of the UI handler. Peer subscribers must not echo the same event back. Programmatic BaseSlider.SetValue and BaseTwoStatePushButton.SetStateUp/Down were inspected and do not raise user input events.

Distinguish requested state, successful transport, and actual device feedback. The imported Samsung driver's SendCommand can return True even after a failed send. Do not treat it as device acknowledgement.

Validate CRC, byte-identical parse/serialize roundtrip, references, object names, bounds and event uniqueness. Report separately whether CVC compilation, simulator behavior and physical equipment have actually been checked. Do not describe a static check as a successful CVC build.

The sibling archive contains experimental project-specific scripts, not a safe automatic pipeline. Read before running: many use hardcoded Windows paths, old inputs, or change project files. See [archive index](references/ARCHIVE.md).

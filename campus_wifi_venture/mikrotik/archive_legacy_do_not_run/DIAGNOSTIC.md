## Exact Diagnostic: What to Paste in WinBox Terminal

### Check 1: See Everything That Currently Exists
Paste these one at a time and send me screenshots or tell me what they print:

```routeros
/ip address print
```
Expected: Should show `10.10.0.1/22` on `bridge-hotspot`

```routeros
/ip hotspot print
```
Expected: Should show `hs-campus` with `interface=bridge-hotspot`, `profile=hsprof-campus`

```routeros
/ip hotspot profile print
```
Expected: Should show `hsprof-campus` with `html-directory=hotspot`

```routeros
/ip dhcp-server print
```
Expected: Should show `dhcp-hotspot` running on `bridge-hotspot`

```routeros
/interface bridge port print
```
Expected: Should show ether2, ether3, ether4, wlan1 all inside `bridge-hotspot`

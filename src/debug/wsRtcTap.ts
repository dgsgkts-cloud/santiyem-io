/**
 * WebSocket + RTCPeerConnection instrumentation tap.
 * Non-invasive: monkey-patches the global constructors to log every
 * open / message / error / close event and every RTC state transition.
 *
 * Enabled only for the OpenAI Realtime endpoints so we don't spam unrelated
 * sockets (Supabase realtime, HMR, etc.).
 */

const TAG = "[wsrtc]";
const MATCH = /api\.openai\.com|realtime/i;

function installWebSocketTap() {
  const OrigWS = window.WebSocket;
  if ((OrigWS as any).__lovTapped) return;

  const Patched: any = function (url: string | URL, protocols?: string | string[]) {
    const u = String(url);
    const ws: WebSocket = protocols === undefined
      ? new OrigWS(url)
      : new OrigWS(url, protocols as any);

    if (MATCH.test(u)) {
      const t0 = performance.now();
      console.log(`${TAG} ➡️  WS OPENING`, { url: u, protocols, readyState: ws.readyState });

      ws.addEventListener("open", (ev) => {
        console.log(`${TAG} ✅ WS OPEN in ${Math.round(performance.now() - t0)}ms`, {
          url: u, readyState: ws.readyState, ev,
        });
      });
      ws.addEventListener("error", (ev) => {
        console.error(`${TAG} ❌ WS ERROR`, { url: u, readyState: ws.readyState, ev });
      });
      ws.addEventListener("close", (ev: CloseEvent) => {
        console.error(`${TAG} 🔌 WS CLOSE`, {
          url: u,
          code: ev.code,
          reason: ev.reason,
          wasClean: ev.wasClean,
          readyState: ws.readyState,
          uptimeMs: Math.round(performance.now() - t0),
        });
        console.dir(ev, { depth: null } as any);
      });
      ws.addEventListener("message", (ev: MessageEvent) => {
        const data = typeof ev.data === "string" ? ev.data.slice(0, 500) : `<binary ${(ev.data as any)?.byteLength ?? "?"}B>`;
        console.log(`${TAG} 📨 WS MSG`, { url: u, data });
      });
    }
    return ws;
  };
  Patched.prototype = OrigWS.prototype;
  Patched.CONNECTING = OrigWS.CONNECTING;
  Patched.OPEN = OrigWS.OPEN;
  Patched.CLOSING = OrigWS.CLOSING;
  Patched.CLOSED = OrigWS.CLOSED;
  (Patched as any).__lovTapped = true;
  window.WebSocket = Patched;
  console.log(`${TAG} WebSocket tap installed`);
}

function installRTCTap() {
  const OrigPC = window.RTCPeerConnection;
  if (!OrigPC || (OrigPC as any).__lovTapped) return;

  const Patched: any = function (config?: RTCConfiguration) {
    const pc = new OrigPC(config);
    const t0 = performance.now();
    console.log(`${TAG} ➡️  RTCPeerConnection created`, { config });

    pc.addEventListener("connectionstatechange", () => {
      console.log(`${TAG} 🔄 RTC connectionState → ${pc.connectionState}`, { uptimeMs: Math.round(performance.now() - t0) });
    });
    pc.addEventListener("iceconnectionstatechange", () => {
      console.log(`${TAG} 🧊 RTC iceConnectionState → ${pc.iceConnectionState}`);
    });
    pc.addEventListener("icegatheringstatechange", () => {
      console.log(`${TAG} 🧊 RTC iceGatheringState → ${pc.iceGatheringState}`);
    });
    pc.addEventListener("signalingstatechange", () => {
      console.log(`${TAG} 📶 RTC signalingState → ${pc.signalingState}`);
    });
    pc.addEventListener("icecandidateerror", (ev: any) => {
      console.error(`${TAG} ❌ RTC iceCandidateError`, {
        errorCode: ev?.errorCode,
        errorText: ev?.errorText,
        url: ev?.url,
        address: ev?.address,
        port: ev?.port,
      });
    });
    pc.addEventListener("track", (ev) => {
      console.log(`${TAG} 🎧 RTC track`, { kind: ev.track.kind, id: ev.track.id, streams: ev.streams.length });
    });
    return pc;
  };
  Patched.prototype = OrigPC.prototype;
  (Patched as any).__lovTapped = true;
  window.RTCPeerConnection = Patched;
  console.log(`${TAG} RTCPeerConnection tap installed`);
}

try { installWebSocketTap(); } catch (e) { console.error(`${TAG} ws tap install failed`, e); }
try { installRTCTap(); } catch (e) { console.error(`${TAG} rtc tap install failed`, e); }

export {};

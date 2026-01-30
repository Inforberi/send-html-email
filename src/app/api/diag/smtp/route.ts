export const runtime = "nodejs";

import net from "node:net";

type ProbeResult = { ok: boolean; ms: number; error?: string };

const probe = (host: string, port: number): Promise<ProbeResult> =>
  new Promise((resolve) => {
    const startedAt = Date.now();
    const socket = new net.Socket();

    const finish = (result: ProbeResult) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(5_000);

    socket.on("connect", () => finish({ ok: true, ms: Date.now() - startedAt }));
    socket.on("timeout", () => finish({ ok: false, ms: Date.now() - startedAt, error: "timeout" }));
    socket.on("error", (e) => finish({ ok: false, ms: Date.now() - startedAt, error: e.message }));

    socket.connect(port, host);
  });

export const GET = async (): Promise<Response> => {
  const [p465, p587] = await Promise.all([
    probe("smtp.gmail.com", 465),
    probe("smtp.gmail.com", 587),
  ]);

  return Response.json({ p465, p587 });
};
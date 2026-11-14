import { NextResponse } from 'next/server';
import os from 'os';

export async function GET() {
  const interfaces = os.networkInterfaces();
  const ips: { address: string; name: string }[] = [];

  for (const [name, netInterface] of Object.entries(interfaces)) {
    if (!netInterface) continue;
    for (const iface of netInterface) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({
          address: iface.address,
          name,
        });
      }
    }
  }

  // Prioritize active Wi-Fi or wireless interfaces and exclude virtual host-only subnets (192.168.56.x)
  const wifiIp = ips.find((i) => i.name.toLowerCase().includes('wi-fi') || i.name.toLowerCase().includes('wlan'));
  const validLanIp = ips.find(
    (i) => !i.address.startsWith('192.168.56.') && !i.name.toLowerCase().includes('virtual')
  );

  const preferred = wifiIp || validLanIp || ips[0];

  let tunnelUrl = '';
  try {
    const fs = await import('fs');
    const path = await import('path');
    const p = path.join(process.cwd(), 'src', 'lib', 'tunnel.json');
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
      tunnelUrl = data.tunnelUrl || '';
    }
  } catch {}

  return NextResponse.json({
    ip: preferred?.address || 'localhost',
    allIps: ips,
    tunnelUrl,
  });
}

import { BlockList, isIP } from 'node:net';
import type { Office } from '../database/schema/office.schema.js';

/** Parses "addr/prefix" (IPv4 or IPv6); null when malformed. */
export function parseCidr(cidr: string) {
  const [address, prefixText, extra] = cidr.trim().split('/');
  const family = isIP(address);
  const prefix = Number(prefixText);
  if (extra !== undefined || !family || !Number.isInteger(prefix)) return null;
  if (prefix < 0 || prefix > (family === 4 ? 32 : 128)) return null;
  return { address, prefix, type: family === 4 ? 'ipv4' : 'ipv6' } as const;
}

/** "::ffff:203.0.113.5" (IPv4-mapped, common behind Node) -> "203.0.113.5". */
function normalizeIp(ip: string) {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  return mapped ? mapped[1] : ip;
}

export function ipInRanges(ip: string | undefined, ranges: string[]) {
  if (!ip || ranges.length === 0) return false;
  const address = normalizeIp(ip);
  const family = isIP(address);
  if (!family) return false;
  const list = new BlockList();
  for (const range of ranges) {
    const cidr = parseCidr(range);
    if (cidr) list.addSubnet(cidr.address, cidr.prefix, cidr.type);
  }
  return list.check(address, family === 4 ? 'ipv4' : 'ipv6');
}

/** Great-circle distance in metres (haversine). */
export function distanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
) {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) *
      Math.cos(rad(b.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type VerificationMethod = 'ip' | 'location' | 'ip_or_location';

/** The first active office the check-in can be verified against, and how. */
export function matchOffice(
  offices: Office[],
  method: VerificationMethod,
  evidence: { ip?: string; latitude?: number; longitude?: number },
): { officeId: number; by: 'ip' | 'location' } | null {
  const tryIp = method === 'ip' || method === 'ip_or_location';
  const tryLocation = method === 'location' || method === 'ip_or_location';
  for (const office of offices.filter((o) => o.isActive)) {
    if (tryIp && ipInRanges(evidence.ip, office.ipRanges)) {
      return { officeId: office.id, by: 'ip' };
    }
    if (
      tryLocation &&
      evidence.latitude !== undefined &&
      evidence.longitude !== undefined &&
      office.latitude !== null &&
      office.longitude !== null &&
      office.radiusMeters !== null &&
      distanceMeters(
        { latitude: evidence.latitude, longitude: evidence.longitude },
        { latitude: office.latitude, longitude: office.longitude },
      ) <= office.radiusMeters
    ) {
      return { officeId: office.id, by: 'location' };
    }
  }
  return null;
}

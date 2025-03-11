import * as dns from "dns";
import type { IPv4 } from "ip-num";

export async function reverseLookup(ip: IPv4 | IPv4[]): Promise<string[]> {
	const ipArray = Array.isArray(ip) ? ip : [ip];
	let hostnames: Promise<string>[] = [];

	ipArray.forEach((ipAddr) => {
		hostnames.push(
			new Promise((resolve, reject) => {
				dns.reverse(ipAddr.toString(), (err, hostnames) => {
					if (err) {
						reject(err);
					} else {
						resolve(hostnames[0] || "");
					}
				});
			})
		);
	});

	return Promise.all(hostnames);
}

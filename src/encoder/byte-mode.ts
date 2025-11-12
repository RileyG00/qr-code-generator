export const encodeByteModePayload = (input: string): Uint8Array => {
	const bytes = new Uint8Array(input.length);
	for (let i = 0; i < input.length; i++) {
		bytes[i] = input.charCodeAt(i) & 0xff;
	}
	return bytes;
};

export const encodeUtf8 = (input: string): Uint8Array =>
	new TextEncoder().encode(input);

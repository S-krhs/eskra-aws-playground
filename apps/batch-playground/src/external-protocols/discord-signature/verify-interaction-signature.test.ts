import { generateKeyPairSync, sign } from "node:crypto";

import { describe, expect, it } from "vitest";

import { verifyInteractionSignature } from "./verify-interaction-signature.js";

const createKeyPair = () => {
	const { publicKey, privateKey } = generateKeyPairSync("ed25519");
	const publicKeyHex = publicKey
		.export({ format: "der", type: "spki" })
		.subarray(-32)
		.toString("hex");

	return { publicKeyHex, privateKey };
};

const signMessage = (
	privateKey: ReturnType<typeof createKeyPair>["privateKey"],
	timestamp: string,
	rawBody: string,
): string => {
	return sign(null, Buffer.from(timestamp + rawBody), privateKey).toString(
		"hex",
	);
};

describe("verifyInteractionSignature", () => {
	const timestamp = "1720000000";
	const rawBody = '{"type":1}';

	it("正しい署名なら true を返す", () => {
		const { publicKeyHex, privateKey } = createKeyPair();
		const signature = signMessage(privateKey, timestamp, rawBody);

		expect(
			verifyInteractionSignature({
				publicKey: publicKeyHex,
				signature,
				timestamp,
				rawBody,
			}),
		).toBe(true);
	});

	it("body が改ざんされていると false を返す", () => {
		const { publicKeyHex, privateKey } = createKeyPair();
		const signature = signMessage(privateKey, timestamp, rawBody);

		expect(
			verifyInteractionSignature({
				publicKey: publicKeyHex,
				signature,
				timestamp,
				rawBody: '{"type":2}',
			}),
		).toBe(false);
	});

	it("別の鍵で署名されていると false を返す", () => {
		const { publicKeyHex } = createKeyPair();
		const { privateKey: otherPrivateKey } = createKeyPair();
		const signature = signMessage(otherPrivateKey, timestamp, rawBody);

		expect(
			verifyInteractionSignature({
				publicKey: publicKeyHex,
				signature,
				timestamp,
				rawBody,
			}),
		).toBe(false);
	});

	it("hex として不正な public key や署名なら throw せず false を返す", () => {
		const { publicKeyHex, privateKey } = createKeyPair();
		const signature = signMessage(privateKey, timestamp, rawBody);

		expect(
			verifyInteractionSignature({
				publicKey: "zz".repeat(32),
				signature,
				timestamp,
				rawBody,
			}),
		).toBe(false);

		expect(
			verifyInteractionSignature({
				publicKey: publicKeyHex.slice(0, 32),
				signature,
				timestamp,
				rawBody,
			}),
		).toBe(false);

		expect(
			verifyInteractionSignature({
				publicKey: publicKeyHex,
				signature: "not-hex",
				timestamp,
				rawBody,
			}),
		).toBe(false);

		expect(
			verifyInteractionSignature({
				publicKey: publicKeyHex,
				signature: signature.slice(0, 64),
				timestamp,
				rawBody,
			}),
		).toBe(false);
	});

	it("空入力なら false を返す", () => {
		expect(
			verifyInteractionSignature({
				publicKey: "",
				signature: "",
				timestamp: "",
				rawBody: "",
			}),
		).toBe(false);
	});
});

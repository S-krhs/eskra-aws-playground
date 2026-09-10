// In scope: verifying the Ed25519 signature on an incoming Discord interaction request
// Out of scope: parsing the interaction body, building a response, resolving the public key
import { createPublicKey, verify } from "node:crypto";

const ED25519_SPKI_DER_PREFIX_HEX = "302a300506032b6570032100";
const ED25519_PUBLIC_KEY_HEX_LENGTH = 64;
const ED25519_SIGNATURE_HEX_LENGTH = 128;
const HEX_PATTERN = /^[0-9a-fA-F]+$/;

interface InteractionSignatureInput {
	publicKey: string;
	signature: string;
	timestamp: string;
	rawBody: string;
}

/** Confirms the request genuinely came from the application, not just that it's well-formed. */
export const verifyInteractionSignature = (
	input: InteractionSignatureInput,
): boolean => {
	const { publicKey, signature, timestamp, rawBody } = input;

	if (
		publicKey.length !== ED25519_PUBLIC_KEY_HEX_LENGTH ||
		!HEX_PATTERN.test(publicKey)
	) {
		return false;
	}

	if (
		signature.length !== ED25519_SIGNATURE_HEX_LENGTH ||
		!HEX_PATTERN.test(signature)
	) {
		return false;
	}

	try {
		const publicKeyObject = createPublicKey({
			key: Buffer.from(ED25519_SPKI_DER_PREFIX_HEX + publicKey, "hex"),
			format: "der",
			type: "spki",
		});

		return verify(
			null,
			Buffer.from(timestamp + rawBody),
			publicKeyObject,
			Buffer.from(signature, "hex"),
		);
	} catch {
		return false;
	}
};

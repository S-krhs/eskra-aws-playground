// In scope: turning the tweet text into the compose-screen URL
// Out of scope: assembling the text, rendering the link

/** Builds the URL that opens the tweet screen carrying the given text */
export const shareUrl = (text: string): string => {
	return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&hashtags=sasaharaUK`;
};

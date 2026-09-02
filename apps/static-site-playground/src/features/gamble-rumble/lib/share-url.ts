// In scope: ツイート文面を投稿画面の URL にする
// Out of scope: 文面の組み立て、リンクの描画

/** 渡された文面を載せて、ツイート画面を開く URL を作る */
export const shareUrl = (text: string): string => {
	return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&hashtags=sasaharaUK`;
};

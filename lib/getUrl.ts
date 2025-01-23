export async function getUrl(urls: string[]): Promise<Map<string, string> | null> {
  console.log("getUrl urls", urls);

  const response = await fetch('/api/ai/getUrlServer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ urls }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! in getUrl status: ${response.status}`);
  }

  const result = await response.json();
  console.log("got URLs", result.response);
  return new Map(Object.entries(result.response));
}
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
  } catch {
    return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 AnyShare/1.0',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json({
        title: parsedUrl.hostname,
        url: parsedUrl.toString(),
        favicon: `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=64`,
      });
    }

    const html = await response.text();

    const getMeta = (propNames: string[]): string | undefined => {
      for (const name of propNames) {
        const regex1 = new RegExp(
          `<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']*)["']`,
          'i'
        );
        const regex2 = new RegExp(
          `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${name}["']`,
          'i'
        );
        const match = html.match(regex1) || html.match(regex2);
        if (match && match[1]) {
          return decodeHtmlEntities(match[1].trim());
        }
      }
      return undefined;
    };

    // Extract title
    let title = getMeta(['og:title', 'twitter:title']);
    if (!title) {
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        title = decodeHtmlEntities(titleMatch[1].trim());
      }
    }
    if (!title) {
      title = parsedUrl.hostname;
    }

    // Extract description
    const description = getMeta(['og:description', 'twitter:description', 'description']);

    // Extract image
    let image = getMeta(['og:image', 'twitter:image', 'image']);
    if (image && !image.startsWith('http')) {
      try {
        image = new URL(image, parsedUrl.origin).toString();
      } catch {
        image = undefined;
      }
    }

    // Site Name
    const siteName = getMeta(['og:site_name']) || parsedUrl.hostname.replace(/^www\./, '');

    // Favicon
    let favicon: string | undefined;
    const iconMatch = html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']*)["']/i);
    if (iconMatch && iconMatch[1]) {
      const rawIcon = iconMatch[1].trim();
      try {
        favicon = rawIcon.startsWith('http') ? rawIcon : new URL(rawIcon, parsedUrl.origin).toString();
      } catch {
        favicon = `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=64`;
      }
    } else {
      favicon = `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=64`;
    }

    return NextResponse.json({
      title,
      description,
      image,
      siteName,
      favicon,
      url: parsedUrl.toString(),
    });
  } catch (error) {
    console.error('OG fetch failed:', error);
    // Return graceful fallback
    return NextResponse.json({
      title: parsedUrl.hostname,
      url: parsedUrl.toString(),
      favicon: `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=64`,
    });
  }
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

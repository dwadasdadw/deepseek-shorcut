import type { FieldContext } from '@lark-base-open/faas-sdk';

export const ATTACHMENT_DOMAINS = ['feishu.cn', 'feishucdn.com', 'larksuite.com', 'larksuitecdn.com'];
export const MAX_IMAGE_REQUEST_BYTES = 48 * 1024 * 1024;
const MAX_IMAGE_BYTES = 32 * 1024 * 1024;
const MAX_IMAGES = 600;
const REDIRECT_STATUS = [301, 302, 303, 307, 308];

type ImageAttachment = { name?: unknown; type?: unknown; size?: unknown; tmp_url?: unknown };
type MessagePart = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } };

function isImageAttachment(value: unknown): value is ImageAttachment {
  if (!value || typeof value !== 'object') return false;
  const { type, name } = value as ImageAttachment;
  return (typeof type === 'string' && type.startsWith('image/')) ||
    (typeof name === 'string' && /\.(?:jpe?g|png|gif|webp)$/i.test(name));
}

function imageMimeType(bytes: Buffer): string | undefined {
  const signature = bytes.toString('hex', 0, 8);
  if (signature.startsWith('ffd8ff')) return 'image/jpeg';
  if (signature === '89504e470d0a1a0a') return 'image/png';
  const header = bytes.toString('latin1', 0, 6);
  if (header === 'GIF87a' || header === 'GIF89a') return 'image/gif';
  if (bytes.toString('latin1', 0, 4) === 'RIFF' && bytes.toString('latin1', 8, 12) === 'WEBP') {
    return 'image/webp';
  }
}

async function downloadAttachment(source: string, context: FieldContext): Promise<Buffer> {
  let url = new URL(source);
  for (let redirects = 0; redirects <= 3; redirects++) {
    if (url.protocol !== 'https:' || url.port || url.username || url.password ||
        !ATTACHMENT_DOMAINS.some(domain => url.hostname === domain || url.hostname.endsWith(`.${domain}`))) {
      throw new Error('Invalid Feishu attachment URL');
    }
    const response = await context.fetch(url.href, {
      redirect: 'manual',
      size: MAX_IMAGE_BYTES,
      timeout: 30_000,
    });
    if (response.ok) return response.buffer();

    const location = response.headers.get('location');
    if (!location || !REDIRECT_STATUS.includes(response.status)) break;
    url = new URL(location, url);
  }
  throw new Error('Unable to download Feishu attachment');
}

export async function buildImageContent(
  prompt: string,
  attachments: unknown[],
  context: FieldContext,
): Promise<MessagePart[] | null> {
  const images = attachments.filter(isImageAttachment);
  if (!images.length || images.length > MAX_IMAGES) return null;

  const content: MessagePart[] = [{ type: 'text', text: prompt }];
  let imageUrlBytes = 0;
  for (const { size, tmp_url: url } of images) {
    if (typeof url !== 'string' || !url || (typeof size === 'number' && size > MAX_IMAGE_BYTES)) return null;
    const bytes = await downloadAttachment(url, context);
    if (bytes.length > MAX_IMAGE_BYTES) return null;
    const mime = imageMimeType(bytes);
    if (!mime) continue;

    const dataUrl = `data:${mime};base64,${bytes.toString('base64')}`;
    imageUrlBytes += dataUrl.length;
    if (imageUrlBytes > MAX_IMAGE_REQUEST_BYTES) return null;
    content.push({ type: 'image_url', image_url: { url: dataUrl } });
  }
  return content.length > 1 ? content : null;
}

import { Directory, File, Paths } from 'expo-file-system';

export const snapDir = () => new Directory(Paths.document, 'snapshots');

export async function saveImage(url: string, label: string, tag = 'snap') {
  const d = snapDir();
  if (!d.exists) d.create();
  const f = new File(d, `${tag}__${label.replace(/\W+/g, '_')}__${Date.now()}.jpg`);
  await File.downloadFileAsync(url, f);
  return f;
}

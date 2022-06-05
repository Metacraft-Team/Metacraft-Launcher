export default function formatAddress (address) {
  if (!address || typeof address !== 'string') return ''

  return address.replace(/^0x(\S{0,6}).*?(\S{0,6})$/, '0x$1...$2')
}

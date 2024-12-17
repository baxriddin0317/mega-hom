export const FormattedPrice = (price: number) => {
  const convertedPrice = new Intl.NumberFormat('en-US', {
    useGrouping: true,
  }).format(price).replace(/,/g, ' ');

  return convertedPrice
}
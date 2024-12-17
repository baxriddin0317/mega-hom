import ProductContent from '@/components/contents/ProductContent'

type tParams = Promise<{ id: string }>;

export default async function Product (props: { params: tParams }) {
  const { id } = await props.params;
  
  return (
    <ProductContent productID={id} />
  )
}
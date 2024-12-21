"use client"
import { ProductT } from '@/lib/types';
import useProductStore from '@/zustand/useProductStore';
import { Switch } from '@headlessui/react';
import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast';
import Loader from '../Loader';

const ProductRow = ({item}: {item:ProductT}) => {
  const { loading, updateProduct } = useProductStore();

  const [updatedProduct, setUpdatedProduct] = useState<ProductT>(item);
  
  const handleUpdate = async () => {
    if (item.id) {
      await updateProduct(item.id, updatedProduct);
      toast.success('Product Updated Successfully');
    }
  };

  useEffect(() => {
    if(item.isBest != updatedProduct.isBest || item.isNew != updatedProduct.isNew){
      handleUpdate();
    }
  }, [updatedProduct.isNew, updatedProduct.isBest])

  return (
    <>
      <td className="h-12 px-6 text-md transition duration-300 border-t border-l first:border-l-0 border-pink-100 stroke-slate-500 text-slate-500 first-letter:uppercase ">
        {loading && <div className='fixed'><Loader /></div>}
        <Switch
          checked={updatedProduct.isNew}
          onChange={() => setUpdatedProduct({ ...updatedProduct, isNew: !updatedProduct.isNew })}
          className={`${
            updatedProduct.isNew ? 'bg-brand' : 'bg-gray-200'
          } relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
        >
          <span
            className={`${
              updatedProduct.isNew ? 'translate-x-6' : 'translate-x-1'
            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
          />
        </Switch>
      </td>
      <td className="h-12 px-6 text-md transition duration-300 border-t border-l first:border-l-0 border-pink-100 stroke-slate-500 text-slate-500 first-letter:uppercase ">
        {loading && <div className='fixed'><Loader /></div>}
        <Switch
          checked={updatedProduct.isBest}
          onChange={() => setUpdatedProduct({ ...updatedProduct, isBest: !updatedProduct.isBest })}
          className={`${
            updatedProduct.isBest ? 'bg-brand' : 'bg-gray-200'
          } relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
        >
          <span
            className={`${
              updatedProduct.isBest ? 'translate-x-6' : 'translate-x-1'
            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
          />
        </Switch>
      </td>
    </>
  );
}

export default ProductRow
import useCartProductStore from "@/zustand/useCartStore";
import React from "react";
import { HiMinus } from "react-icons/hi";
import { LuPlus } from "react-icons/lu";

const Quantity = ({id}: {id:string}) => {
  const { incrementQuantity, decrementQuantity, getItemQuantity, calculateTotals } = useCartProductStore();
  
  const quantityInBasket = getItemQuantity(id);

  const handleAddQuantity = () => {
    incrementQuantity(id);
    calculateTotals();
  };

  const handleDeleteQuantity = () => {
    decrementQuantity(id);
    calculateTotals();
  };


  return (
    <div className="ml-auto rounded-xl border border-gray-300 flex items-center gap-8 w-fit py-1.5 px-2">
      <button
        onClick={handleDeleteQuantity}
        disabled={quantityInBasket == 0}
        className="size-9 bg-gray-100 flex items-center justify-center rounded-full"
      >
        <HiMinus className="text-black" />
      </button>
      <div className="w-14 border-b">
        <span className="block text-center">{quantityInBasket}</span>
      </div>
      <button 
        onClick={handleAddQuantity} 
        className="size-9 bg-indigo-500 text-white flex items-center justify-center rounded-full"
      >
        <LuPlus className="text-white" />
      </button>
    </div>
  );
};

export default Quantity;

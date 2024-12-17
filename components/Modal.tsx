"use client";
import useCartProductStore from "@/zustand/useCartStore";
import { useOrderStore } from "@/zustand/useOrderStore";
import { Timestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import React, { Dispatch, SetStateAction, useState } from "react";
import toast from "react-hot-toast";
import Loader from "./Loader";

interface props {
  setOpen: Dispatch<SetStateAction<boolean>>;
}

const SubmitModal = ({ setOpen }: props) => {
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const { cartProducts, totalPrice, totalQuantity, clearBasket } = useCartProductStore();
  const { addOrder } = useOrderStore();
  // navigate
  const navigate = useRouter();
  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ""); // Remove non-numeric characters
    if (value.startsWith("998")) {
      value = value.slice(3); // Remove "998" from input if present
    }
    value = value.slice(0, 9); // Limit to 9 digits

    // Format the value as +998 (XX) XXX-XX-XX
    const formattedValue = value
      ? `+998 (${value.slice(0, 2)}) ${value.slice(2, 5)}${
          value.length > 5 ? "-" : ""
        }${value.slice(5, 7)}${value.length > 7 ? "-" : ""}${value.slice(7)}`
      : "";

    setPhoneNumber(formattedValue);
  };

  const handleSubmit = async () => {
    if(cartProducts.length === 0) {
      return toast.error("Your basket is empty.");
    };

    if (
      firstName == "" ||
      lastName == "" ||
      phoneNumber== ""
    ) {
      return toast.error("all fields are required");
    }

    const submitData = {
      id: "",
      clientName: firstName,
      clientLastName: lastName,
      clientPhone: phoneNumber,
      date: Timestamp.now(),
      basketItems: cartProducts,
      totalPrice: totalPrice,
      totalQuantity: totalQuantity,
    };
      
    try {
      setLoading(true)
      await addOrder(submitData);
      await fetch('/api/sendOrderEmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });
      clearBasket();
      setLoading(false)
      toast.success("Add order successfully");
      navigate.push("/");
    } catch (error) {
      console.log(error);
      toast.error("Add order failed");
    }
  };

  return (
    <div className="fixed z-99 w-full h-full inset-0 flex items-center justify-center">
      <div
        onClick={() => setOpen(false)}
        className="absolute inset-0 size-full bg-black/80 z-0"
      ></div>
      <div className="max-w-sm w-full bg-white rounded-md space-y-3 p-5 z-10">
        <div>
          <label
            htmlFor="first-name"
            className="block text-sm font-medium text-gray-900"
          >
            Ism
          </label>
          <div className="mt-1">
            <input
              id="first-name"
              name="first-name"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:outline-none focus:ring-inset focus:ring-indigo-600 sm:text-sm px-2"
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="last-name"
            className="block text-sm font-medium text-gray-900"
          >
            Familya
          </label>
          <div className="mt-1">
            <input
              id="last-name"
              name="last-name"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:outline-none focus:ring-inset focus:ring-indigo-600 sm:text-sm px-2"
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="phone-number"
            className="block text-sm font-medium text-gray-900"
          >
            Telefon
          </label>
          <div className="mt-1">
            <input
              id="phone-number"
              name="phone-number"
              type="text"
              value={phoneNumber}
              onChange={handlePhoneNumberChange}
              className="block w-full rounded-md border-0 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:outline-none focus:ring-inset focus:ring-indigo-600 sm:text-sm px-2"
              placeholder="+998 (__) ___-__-__"
            />
          </div>
        </div>

        <div className="pt-3">
          <button
            onClick={handleSubmit}
            type="button"
            className="flex items-center justify-center bg-indigo-500 transition-all ease-in-out hover:bg-indigo-600 rounded-xl max-w-lg w-full text-white p-2"
          >
            {loading ? <div className="size-8"><Loader /></div> : "Buyurtmani Yuborish"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubmitModal;

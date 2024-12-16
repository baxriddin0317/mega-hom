"use client";
import Loader from "@/components/Loader";
import { fireDB, fireStorage } from "@/firebase/FirebaseConfig";
import { CategoryI, ImageT } from "@/lib/types";
import useCategoryStore from "@/zustand/useCategoryStore";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { v4 as uuidv4 } from 'uuid';

const AddProductPage = () => {
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryI | null>(null);
  const { categories, fetchCategories } = useCategoryStore();

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // navigate
  const navigate = useRouter();

  // product state
  const [product, setProduct] = useState({
    title: "",
    price: "",
    productImageUrl: [] as ImageT[],
    category: "",
    subCategory: "",
    description: "",
    quantity: 0,
    time: Timestamp.now(),
    date: new Date().toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    }),
    storageFileId: ""
  });

  const handleImageUpload = async (files: FileList | null) => {
    if (!files) return;
    setLoading(true);

    const uuid = uuidv4();
    const uploadPromises = Array.from(files).map(async (file) => {
      const storageRef = product.storageFileId.length === 0 ? ref(fireStorage, `products/${uuid}/${file.name}`) : ref(fireStorage, `products/${product.storageFileId}/${file.name}`);
      
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      return { url: downloadUrl, path: storageRef.fullPath };
    });

    const imageUrls = await Promise.all(uploadPromises);
    setProduct((prevProduct) => ({
      ...prevProduct,
      productImageUrl: [...prevProduct.productImageUrl, ...imageUrls],
      storageFileId: uuid
    }));
    setLoading(false);
  };

  // get sub category
  const handleGetSubCategory = (value:string) => {
    const findCategory = categories.find(c => c.name == value);
    if(findCategory){
      setSelectedCategory(findCategory)
    }
  }

  // Add Product Function
  const addProductFunction = async () => {
    if (
      product.title == "" ||
      product.price == "" ||
      product.productImageUrl.length == 0 ||
      product.category == "" ||
      product.description == ""
    ) {
      return toast.error("all fields are required");
    }

    setLoading(true);
    try {
      const productRef = collection(fireDB, "products");
      await addDoc(productRef, product);
      toast.success("Add product successfully");
      navigate.push("/admin-dashboard");
      setLoading(false);
    } catch (error) {
      console.log(error);
      setLoading(false);
      toast.error("Add product failed");
    }
  };
  
  return (
    <div className="flex justify-center items-center h-screen">
      {loading && <Loader />}
      {/* Login Form  */}
      <div className="login_Form bg-pink-50 px-8 py-6 border border-pink-100 rounded-xl shadow-md">
        {/* Top Heading  */}
        <div className="mb-5">
          <h2 className="text-center text-2xl font-bold text-pink-500 ">Add product</h2>
        </div>
        {/* Input title  */}
        <div className="mb-3">
          <input
            type="text"
            name="title"
            value={product.title}
            onChange={(e) => {
              setProduct({
                ...product,
                title: e.target.value,
              });
            }}
            placeholder="Product Title"
            className="bg-pink-50 border text-pink-300 border-pink-200 px-2 py-2 w-96 rounded-md outline-none placeholder-pink-300"
          />
        </div>
        {/* Input price  */}
        <div className="mb-3">
          <input
            type="number"
            name="price"
            value={product.price}
            onChange={(e) => {
              setProduct({
                ...product,
                price: e.target.value,
              });
            }}
            placeholder="Product Price"
            className="bg-pink-50 border text-pink-300 border-pink-200 px-2 py-2 w-96 rounded-md outline-none placeholder-pink-300"
          />
        </div>
        {/* Input img  */}
        <div className="mb-3">
          <input
            type="file"
            multiple
            name="productImageUrl"
            onChange={(e) => handleImageUpload(e.target.files)}
            placeholder="Product Image Url"
            accept="image/*"
            className="bg-pink-50 border text-pink-300 border-pink-200 px-2 py-2 w-96 rounded-md outline-none placeholder-pink-300"
          />
        </div>
        {/* Input category  */}
        <div className="mb-3">
          <select
            value={product.category}
            onChange={(e) => {
              setProduct({
                ...product,
                category: e.target.value,
              });
              handleGetSubCategory(e.target.value)
            }}
            className="w-full px-1 py-2 text-pink-300 bg-pink-50 border border-pink-200 rounded-md outline-none  "
          >
            <option >Select Product Category</option>
            {categories.map((value) => {
              const { name, id } = value;
              return (
                <option
                  className=" first-letter:uppercase"
                  key={id}
                  value={name}
                >
                  {name}
                </option>
              );
            })}
          </select>
        </div>
        {/* Input sub category  */}
        <div className="mb-3">
          <select
            disabled={selectedCategory == null}
            value={product.subCategory}
            onChange={(e) => {
              setProduct({
                ...product,
                subCategory: e.target.value,
              });
            }}
            className="w-full px-1 py-2 text-pink-300 bg-pink-50 border border-pink-200 rounded-md outline-none  "
          >
            <option >Select Product Sub Category</option>
            {selectedCategory?.subcategory.map((value,idx) => {
              return (
                <option
                  className=" first-letter:uppercase"
                  key={idx}
                  value={value}
                >
                  {value}
                </option>
              );
            })}
          </select>
        </div>
        {/* Input description  */}
        <div className="mb-3">
          <textarea
            value={product.description}
            onChange={(e) => {
              setProduct({
                ...product,
                description: e.target.value,
              });
            }}
            name="description"
            placeholder="Product Description"
            rows={5}
            className=" w-full px-2 py-1 text-pink-300 bg-pink-50 border border-pink-200 rounded-md outline-none placeholder-pink-300 "
          ></textarea>
        </div>
        {/* Add Product Button  */}
        <div className="mb-3">
          <button
            disabled={loading} 
            onClick={addProductFunction}
            type="button"
            className="bg-pink-500 hover:bg-pink-600 w-full text-white text-center py-2 font-bold rounded-md "
          >
            Add product
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddProductPage;

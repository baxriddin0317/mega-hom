"use client"
import Loader from '@/components/Loader'
import { CategoryI } from '@/lib/types';
import useCategoryStore from '@/zustand/useCategoryStore';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react'
import toast from 'react-hot-toast';


const AddCategory = () => {
  const { addCategory, loading } = useCategoryStore();
  const [tagInput, setTagInput] = useState("");
  const navigate = useRouter();
  const [newCategory, setNewCategory] = useState<CategoryI>({
    id: "",
    name: "",
    subcategory: []
  });

  const handleAddTag = () => {
    if (tagInput.trim() === "") {
      toast.error("Tag cannot be empty");
      return;
    }

    if (newCategory.subcategory.includes(tagInput.trim())) {
      toast.error("Tag already exists");
      return;
    }

    setNewCategory({
      ...newCategory,
      subcategory: [...newCategory.subcategory, tagInput.trim()]
    });
    setTagInput("");
  };

  const handleRemoveTag = (tag: string) => {
    setNewCategory({
      ...newCategory,
      subcategory: newCategory.subcategory.filter(t => t !== tag)
    });
  };

  const handleAddCategory = async () => {
    if (newCategory.name == "" || newCategory.subcategory.length < 1) {
      return toast.error("all fields are required");
    }
    
    try {
      await addCategory(newCategory);
      toast.success("Add category successfully");
      navigate.push("/admin-dashboard");
    } catch (error) {
      console.log(error);
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
          <h2 className="text-center text-2xl font-bold text-pink-500 "></h2>
        </div>
        {/* Input One  */}
        <div className="mb-3">
          <input
            type="text"
            name="name"
            value={newCategory.name}
            onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
            placeholder="Category Name"
            className="bg-pink-50 border text-pink-300 border-pink-200 px-2 py-2 w-96 rounded-md outline-none placeholder-pink-300"
          />
        </div>
        <div className="mb-3">
          <div className="flex items-stretch space-x-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Add Subcategory"
              className="bg-pink-50 border text-pink-300 border-pink-200 px-2 py-2 w-full rounded-md outline-none placeholder-pink-300"
            />
            <button onClick={handleAddTag} type="button" className="bg-pink-500 hover:bg-pink-600 text-white px-4 py-2 font-bold rounded-md text-nowrap text-sm">
              Add
            </button>
          </div>
          {/* Display subcategory */}
          <div className="mt-2 flex flex-wrap gap-2">
            {newCategory.subcategory.map((tag, index) => (
              <div
                key={index}
                className="flex items-center bg-pink-100 text-pink-500 px-3 py-1 rounded-md text-sm"
              >
                {tag}
                <button
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-2 text-pink-500 hover:text-pink-700"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
        {/* Add Category Button  */}
        <div className="mb-3">
          <button
            disabled={loading}
            onClick={handleAddCategory}
            type="button"
            className="bg-pink-500 hover:bg-pink-600 w-full text-white text-center py-2 font-bold rounded-md "
          >
            Add category
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddCategory
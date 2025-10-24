import React, { useState, useRef } from "react";
import axios from 'axios';
// Import useTranslation
import { useTranslation } from 'react-i18next';


interface ProductCreateProps {
  onClose: () => void;
  onSuccess: () => void;
}

const ProductCreate: React.FC<ProductCreateProps> = ({ onClose, onSuccess }) => {
  // Initialize useTranslation
  const { t } = useTranslation();

  const [productTitle, setProductTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState("");
  const [location, setLocation] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFileType = (file: File) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif'];
    return allowedTypes.includes(file.type);
  };

  const handleImageChange = (files: File[]) => {
    const validFiles = files.filter(file => {
      if (!validateFileType(file)) {
        // Localized alert
        alert(t('upload_error_type', { fileName: file.name }));
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        // Localized alert
        alert(t('upload_error_size', { fileName: file.name }));
        return false;
      }
      return true;
    });

    if (validFiles.length + images.length > 10) {
      // Localized alert
      alert(t('upload_error_max_images'));
      return;
    }

    setImages([...images, ...validFiles]);
    const previews = validFiles.map(file => URL.createObjectURL(file));
    setImagePreviews([...imagePreviews, ...previews]);
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageChange(Array.from(e.dataTransfer.files));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleImageChange(Array.from(e.target.files));
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setImages(newImages);
    setImagePreviews(newPreviews);
    URL.revokeObjectURL(imagePreviews[index]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validation logic
      if (images.length === 0) {
        throw new Error(t('validation_error_min_image'));
      }

      // Prepare form data
      const formData = new FormData();
      formData.append('title', productTitle);
      formData.append('price', price);
      formData.append('category', category);
      formData.append('description', description);
      formData.append('condition', condition);
      formData.append('location', location);
      images.forEach((image) => formData.append('images', image));

      // Send to backend
      const token = localStorage.getItem('token');
      if (!token) throw new Error(t('auth_error_no_token'));
      const API_URL = import.meta.env.VITE_API_URL || 'https://unitrade2.onrender.com';
      const response = await axios.post(`${API_URL}/api/product/create`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      // Localized alert
      alert(response.data.message || t('product_create_success'));
      
      // Reset states and call onSuccess
      setProductTitle(""); setPrice(""); setCategory(""); setDescription(""); setCondition(""); setLocation("");
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
      setImages([]);
      setImagePreviews([]);

      onSuccess(); // Notify parent component (Browse) to re-fetch and close modal

    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || t('product_create_fail');
      setError(errorMessage);
      console.error('Product creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Category and Condition Options (using array mapping for cleaner structure)
  const categoryOptions = [
    { value: "electronics", labelKey: "category_electronics" },
    { value: "furniture", labelKey: "category_furniture" },
    { value: "textbooks", labelKey: "category_textbooks" },
    { value: "sports", labelKey: "category_sports" },
    { value: "other", labelKey: "category_other" },
  ];

  const conditionOptions = [
    { value: "new", labelKey: "condition_new" },
    { value: "used_like_new", labelKey: "condition_used_like_new" },
    { value: "used_good", labelKey: "condition_used_good" },
    { value: "used_fair", labelKey: "condition_used_fair" },
  ];

  return (
    <div className="font-sans">
      {error && <p className="text-red-500 text-center mb-4">{error}</p>}
      <form onSubmit={handleSubmit}>
        
        {/* Product Images Section */}
        <div className="mb-6">
          <label className="block text-gray-700 font-semibold mb-2">{t('label_product_images')}</label>
          <div
            className={`border-2 border-dashed p-6 rounded-lg text-center transition-colors h-40 flex flex-col justify-center items-center ${
              dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'
              }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept="image/png,image/jpeg,image/gif"
              onChange={handleInputChange}
              className="hidden"
              id="file-upload"
              multiple
              ref={fileInputRef}
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer"
            >
              <svg className="w-10 h-10 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"></path></svg>
              <span className="text-gray-500 font-medium">{t('label_click_or_drag')}</span>
            </label>
            <p className="text-xs text-gray-400 mt-1">
              {t('label_file_requirements')}
            </p>
          </div>
          {/* --------------------- Image Previews --------------------- */}
          {imagePreviews.length > 0 && (
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {imagePreviews.map((preview, index) => (
                <div
                  key={index}
                  className="relative group bg-gray-50 rounded-lg overflow-hidden shadow-md border border-gray-200"
                >
                  {/* Image Container */}
                  <div className="h-28 w-full overflow-hidden flex items-center justify-center">
                    <img
                      src={preview}
                      alt={t('alt_image_preview', { index: index + 1 })}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* File Info */}
                  <div className="p-2 text-xs text-gray-600 truncate">
                    <p className="font-medium truncate">{images[index].name}</p>
                    <p className="text-gray-400">{Math.round(images[index].size / 1024)} KB</p>
                  </div>

                  {/* Remove Button Overlay */}
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute inset-0 bg-red-600/70 text-white flex items-center justify-center 
                      opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold"
                    title={t('button_remove_image')}
                  >
                    {t('button_remove')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Row 1: Product Title & Price */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">{t('label_product_title')} *</label>
            <input
              type="text"
              value={productTitle}
              onChange={(e) => setProductTitle(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg placeholder:text-gray-400 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('placeholder_product_title')}
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2">{t('label_price', { currency: '$' })} *</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg placeholder:text-gray-400 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
              required
            />
          </div>
        </div>

        {/* Row 2: Category */}
        <div className="mb-4">
          <label className="block text-gray-700 font-semibold mb-2">{t('label_category')} *</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg text-gray-500 focus:ring-blue-500 focus:border-blue-500 appearance-none"
            required
          >
            <option value="" disabled>{t('select_category_placeholder')}</option>
            {categoryOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </option>
            ))}
          </select>
        </div>

        {/* Row 3: Description */}
        <div className="mb-4">
          <label className=" block text-gray-700 font-semibold mb-2">{t('label_description')} *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg placeholder:text-gray-400 focus:ring-blue-500 focus:border-blue-500"
            rows={4}
            placeholder={t('placeholder_description')}
            required
          />
        </div>

        {/* Row 4: Condition & Location */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">{t('label_condition')} *</label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-gray-500 focus:ring-blue-500 focus:border-blue-500 appearance-none"
              required
            >
              <option value="" disabled>{t('select_condition_placeholder')}</option>
              {conditionOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2">{t('label_location')} *</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg placeholder:text-gray-400 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('placeholder_location')}
              required
            />
          </div>
        </div>

        {/* Buttons (Footer) */}
        <div className="flex justify-center gap-4"> 
          <button
            type="button"
            onClick={() => {
              // Reset form state and revoke URLs
              setProductTitle(""); setPrice(""); setCategory(""); setDescription(""); setCondition(""); setLocation("");
              imagePreviews.forEach(url => URL.revokeObjectURL(url));
              setImages([]);
              setImagePreviews([]);
              
              onClose(); 
            }}
            className="w-full md:w-1/2 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 border border-gray-300 transition-colors"
            disabled={loading}
          >
            {t('button_cancel')}
          </button>
          <button
            type="submit"
            className="w-full md:w-1/2 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            disabled={loading}
          >
            {loading ? t('button_posting') : t('button_post_item')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductCreate;
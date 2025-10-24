import React, { useState, useEffect, useRef } from "react";
import axios from 'axios';
import { X, Loader2 } from 'lucide-react'; 


interface ProductEditModalProps {
  productId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void; 
}

const ProductEditModal: React.FC<ProductEditModalProps> = ({ productId, isOpen, onClose, onUpdate }) => {

  const [productTitle, setProductTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState("");
  const [location, setLocation] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [loading, setLoading] = useState(false); 
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    if (!isOpen || !productId) return;

    setLoading(true);

    const fetchProduct = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('ไม่พบ token');
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await axios.get(`${API_URL}/api/product/${productId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const product = response.data;
        setProductTitle(product.title);
        setPrice(product.price.toString());
        setCategory(product.category);
        setDescription(product.description);
        setCondition(product.condition);
        setLocation(product.location);
        setExistingImages(product.images || []);
        setImagePreviews(product.images || []);
        setImages([]); 
        setImagesToDelete([]); 
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'ไม่สามารถดึงข้อมูลสินค้าได้');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId, isOpen]);


  useEffect(() => {
    return () => {
      imagePreviews.forEach(preview => {
        if (preview.startsWith('blob:')) {
          URL.revokeObjectURL(preview);
        }
      });
    };
  }, [imagePreviews]);


  const validateFileType = (file: File) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif'];
    return allowedTypes.includes(file.type);
  };


  const handleImageChange = (files: File[]) => {
    const validFiles = files.filter(file => {
      if (!validateFileType(file)) {
        alert(`ไฟล์ ${file.name} ไม่ใช่ประเภทรูปภาพที่รองรับ (PNG, JPG, GIF เท่านั้น)`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert(`ไฟล์ ${file.name} มีขนาดเกิน 10MB`);
        return false;
      }
      return true;
    });

    if (validFiles.length + imagePreviews.length - imagesToDelete.length > 10) {
      alert('อัปโหลดได้สูงสุด 10 รูปภาพ');
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

    e.target.value = ''; 
  };


  const removeImage = (previewUrl: string) => {

    const isExisting = existingImages.includes(previewUrl);

    if (isExisting) {

      setImagesToDelete(prev => [...prev, previewUrl]);

    } else {
 
      
  
      const newImageIndex = imagePreviews.findIndex(url => url === previewUrl) - existingImages.length;
      
 
      setImages(prevImages => prevImages.filter((_, i) => i !== newImageIndex));
      

      URL.revokeObjectURL(previewUrl);
    }
    

    setImagePreviews(prevPreviews => prevPreviews.filter(url => url !== previewUrl));
  };


  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate images
      const finalImageCount = imagePreviews.length - imagesToDelete.length;

      if (finalImageCount === 0) {
         throw new Error('กรุณาอัปโหลดรูปภาพอย่างน้อย 1 รูป');
      }
      if (finalImageCount > 10) {
        throw new Error('อัปโหลดได้สูงสุด 10 รูปภาพ');
      }
      for (const image of images) {
        if (image.size > 10 * 1024 * 1024) {
          throw new Error(`รูปภาพ ${image.name} มีขนาดเกิน 10MB`);
        }
        if (!validateFileType(image)) {
          throw new Error(`รูปภาพ ${image.name} ไม่ใช่ประเภทที่รองรับ (PNG, JPG, GIF เท่านั้น)`);
        }
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

      const imagesToKeep = existingImages.filter(url => !imagesToDelete.includes(url));

      formData.append('imagesToKeep', JSON.stringify(imagesToKeep)); 
      formData.append('imagesToDelete', JSON.stringify(imagesToDelete));

      const token = localStorage.getItem('token');
      if (!token) throw new Error('ไม่พบ token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      await axios.put(`${API_URL}/api/product/${productId}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      alert('แก้ไขสินค้าสำเร็จ');
      onUpdate(); 
      onClose();  
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'ไม่สามารถแก้ไขสินค้าได้';
      setError(errorMessage);
      console.error('Product edit error:', err);
    } finally {
      setLoading(false);
    }
  };

  // ถ้า Modal ปิดอยู่ ไม่ต้อง Render อะไร
  if (!isOpen) return null;

  // UI ของ Modal
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 font-sarabun p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
          title="ปิด"
          disabled={loading}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">แก้ไขสินค้า</h2>
          {error && <p className="text-red-600 bg-red-100 p-3 rounded-lg text-center mb-4 border border-red-300">{error}</p>}
          
          {/* ส่วนแสดง Loading */}
          {loading && (
            <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-20 rounded-xl">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mr-2" />
              <span className="text-lg text-blue-600">กำลังดำเนินการ...</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Upload Area */}
            <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">รูปภาพสินค้า</label>
                <div
                    className={`border-2 border-dashed p-6 rounded-lg text-center transition-colors ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
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
                        disabled={loading}
                    />
                    <label
                        htmlFor="file-upload"
                        className={`cursor-pointer font-medium ${loading ? 'text-gray-500 cursor-not-allowed' : 'text-blue-600 hover:text-blue-800'}`}
                    >
                        คลิกเพื่ออัปโหลดหรือลากวาง
                    </label>
                    <p className="text-sm text-gray-500 mt-1">
                        PNG, JPG, GIF ขนาดไม่เกิน 10MB (รวมสูงสุด **10** รูป)
                    </p>
                </div>

                {/* Image Previews (IMPROVED) */}
                {imagePreviews.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {imagePreviews.map((previewUrl, index) => {
                            // Check if the image is an existing one from the backend
                            const isExistingImage = existingImages.includes(previewUrl);
                            
                            // Skip images that are marked for deletion (only applies to existing images)
                            if (isExistingImage && imagesToDelete.includes(previewUrl)) {
                                return null;
                            }

                            // Determine file name for display
                            let fileName = '';
                            let fileSize = '';

                            if (isExistingImage) {
       
                            } else {
                                // For new images, calculate the correct index in the `images` state
                                // This assumes existing images are at the start of `imagePreviews`
                                const newImageIndex = imagePreviews.slice(0, index).filter(url => !existingImages.includes(url)).length;
                                const file = images[newImageIndex];
                                fileName = file?.name || 'New Image';
                                fileSize = file ? `${Math.round(file.size / 1024)} KB` : 'N/A';
                            }

                            return (
                                <div
                                    key={previewUrl} // Use URL as key
                                    className="relative group bg-gray-50 rounded-lg overflow-hidden shadow-md border border-gray-200"
                                >
                                    {/* Image Container (Fixed Height) */}
                                    <div className="h-28 w-full overflow-hidden flex items-center justify-center">
                                        <img
                                            src={previewUrl}
                                            alt={`ตัวอย่าง ${index + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    
                                    {/* File Info */}
                                    <div className="p-2 text-xs text-gray-600 truncate h-10">
                                        <p className="font-medium truncate">{fileName}</p>
                                        <p className="text-gray-400">{fileSize}</p>
                                    </div>

                                    {/* Remove Button Overlay (Always visible on hover) */}
                                    <button
                                        type="button"
                                        onClick={() => removeImage(previewUrl)} // Pass the URL for direct identification
                                        className="absolute inset-0 bg-red-600/70 text-white flex items-center justify-center 
                                          opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold"
                                        title="ลบรูปภาพ"
                                        disabled={loading}
                                    >
                                        ลบ
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            {/* End Image Previews (IMPROVED) */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Product Title */}
                <div>
                    <label className="block text-gray-700 font-semibold mb-2">ชื่อสินค้า</label>
                    <input
                        type="text"
                        value={productTitle}
                        onChange={(e) => setProductTitle(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        placeholder="กรอกชื่อสินค้า"
                        required
                        disabled={loading}
                    />
                </div>
                {/* Price */}
                <div>
                    <label className="block text-gray-700 font-semibold mb-2">ราคา (บาท)</label>
                    <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        placeholder="กรอกราคา"
                        required
                        min="0"
                        disabled={loading}
                    />
                </div>
            </div>

            {/* Category & Condition */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-gray-700 font-semibold mb-2">หมวดหมู่</label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-blue-500 focus:border-blue-500"
                        required
                        disabled={loading}
                    >
                        <option value="">เลือกหมวดหมู่</option>
                        <option value="electronics">เครื่องใช้ไฟฟ้า</option>
                        <option value="furniture">เฟอร์นิเจอร์</option>
                        <option value="textbooks">หนังสือเรียน</option>
                        <option value="sports">กีฬา</option>
                        <option value="other">อื่นๆ</option>
                    </select>
                </div>
                <div>
                    <label className="block text-gray-700 font-semibold mb-2">สภาพ</label>
                    <select
                        value={condition}
                        onChange={(e) => setCondition(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-blue-500 focus:border-blue-500"
                        required
                        disabled={loading}
                    >
                        <option value="">เลือกสภาพ</option>
                        <option value="new">ใหม่</option>
                        <option value="used_like_new">มือสอง - เหมือนใหม่</option>
                        <option value="used_good">มือสอง - สภาพดี</option>
                        <option value="used_fair">มือสอง - พอใช้</option>
                    </select>
                </div>
            </div>

            {/* Location */}
            <div>
                <label className="block text-gray-700 font-semibold mb-2">สถานที่</label>
                <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="กรอกสถานที่"
                    required
                    disabled={loading}
                />
            </div>
            
            {/* Description */}
            <div>
                <label className="block text-gray-700 font-semibold mb-2">คำอธิบาย</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    rows={4}
                    placeholder="กรอกคำอธิบายสินค้า"
                    required
                    disabled={loading}
                />
            </div>



            {/* Submit Buttons */}
            <div className="flex justify-center gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="bg-gray-200 text-gray-700 py-2.5 px-6 rounded-full font-semibold hover:bg-gray-300 transition"
                disabled={loading}
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="bg-blue-600 text-white py-2.5 px-6 rounded-full font-semibold hover:bg-blue-700 transition flex items-center justify-center"
                disabled={loading}
              >
                {loading ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        กำลังบันทึก...
                    </>
                ) : (
                    'บันทึกการแก้ไข'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProductEditModal;
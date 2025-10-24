import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const MessageEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ title: '', description: '', category: '', location: '', budget: '', urgency: 'medium' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMessage = async () => {
      try {
        const token = localStorage.getItem('token');
        const API_URL = import.meta.env.VITE_API_URL || 'https://unitrade2.onrender.com';
        const res = await axios.get(`${API_URL}/api/messages/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFormData({
          title: res.data.title,
          description: res.data.description,
          category: res.data.category,
          location: res.data.location,
          budget: res.data.budget || '',
          urgency: res.data.urgency
        });
      } catch (err) {
        alert('ไม่สามารถโหลดข้อมูล');
      }
    };
    fetchMessage();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const API_URL = import.meta.env.VITE_API_URL || 'https://unitrade2.onrender.com';
      await axios.put(`${API_URL}/api/messages/${id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('แก้ไขสำเร็จ');
      navigate('/profile');
    } catch (err) {
      alert('เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">แก้ไขข้อความ</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="text" placeholder="หัวข้อ" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-3 border rounded" required />
        <textarea placeholder="รายละเอียด" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-3 border rounded" required />
        <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-3 border rounded" required>
          <option value="electronics">เครื่องใช้ไฟฟ้า</option>
          <option value="furniture">เฟอร์นิเจอร์</option>
          <option value="textbooks">หนังสือเรียน</option>
          <option value="sports">กีฬา</option>
          <option value="other">อื่นๆ</option>
        </select>
        <input type="text" placeholder="สถานที่" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full p-3 border rounded" required />
        <input type="number" placeholder="งบประมาณ" value={formData.budget} onChange={e => setFormData({...formData, budget: e.target.value})} className="w-full p-3 border rounded" />
        <select value={formData.urgency} onChange={e => setFormData({...formData, urgency: e.target.value})} className="w-full p-3 border rounded">
          <option value="low">ไม่เร่งด่วน</option>
          <option value="medium">ปานกลาง</option>
          <option value="high">เร่งด่วน</option>
        </select>
        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="bg-blue-600 text-white py-2 px-6 rounded">บันทึก</button>
          <button type="button" onClick={() => navigate('/profile')} className="bg-gray-200 py-2 px-6 rounded">ยกเลิก</button>
        </div>
      </form>
    </div>
  );
};

export default MessageEdit;
import { useState, ChangeEvent, FormEvent } from 'react';
import { Phone, Mail, Send } from 'lucide-react'; // ใช้ icon จาก lucide-react

// กำหนดประเภทข้อมูลสำหรับฟอร์ม
interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const Contact = () => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage(null); // Clear previous messages

    // --- จำลองการส่งข้อมูลไปยัง API (แทนการใช้ alert) ---
 

    setTimeout(() => {
      setIsSubmitting(false);
      // สมมติว่าส่งสำเร็จ
      setSubmitMessage({ 
        type: 'success', 
        text: 'ส่งข้อความเรียบร้อยแล้ว! เราจะติดต่อกลับคุณโดยเร็วที่สุด' 
      });
      
      // ล้างข้อมูลฟอร์มหลังจากส่งสำเร็จ
      setFormData({ name: '', email: '', subject: '', message: '' });

      // ล้างข้อความแจ้งเตือนหลังจากผ่านไป 5 วินาที
      setTimeout(() => setSubmitMessage(null), 5000); 

    }, 2000); // 2 วินาทีในการจำลองการส่ง
    
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 font-sans">
      
      {/* Contact Header */}
      <div className="text-center mb-10 md:mb-16">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-2">ติดต่อเรา</h1>
        <p className="text-lg text-gray-600 mb-4">มีอะไรให้เราช่วยคุณได้บ้าง?</p>
        <p className="text-sm md:text-base text-gray-500 max-w-2xl mx-auto">
          หากคุณมีปัญหาเกี่ยวกับการซื้อขาย การใช้ระบบ หรืออยากเสนอฟีเจอร์ใหม่ UniTrade ยินดีรับฟังและพร้อมให้ความช่วยเหลือเสมอ ติดต่อเรามาได้เลย!
        </p>
      </div>

      {/* Contact Content (Methods & Form) */}
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Telephone Card */}
        <div className="flex-1 min-w-[300px] bg-white rounded-xl p-6 shadow-lg border border-gray-100 transition-shadow hover:shadow-xl">
          <div className="flex items-center text-blue-600 mb-4">
            <Phone className="w-6 h-6 mr-3" />
            <h2 className="text-xl font-semibold">โทรศัพท์</h2>
          </div>
          <p className="text-gray-600 mb-4">สอบถามข้อมูลเพิ่มเติม หรือติดต่อเจ้าหน้าที่</p>
          
          <div className="my-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
            <p className="text-2xl font-bold text-blue-700 mb-1">09x-xxx-xxxxx</p>
            <p className="text-sm text-gray-600">ให้บริการทุกวัน: 9.00 - 17.00 น.</p>
          </div>
          
          <a 
            href="tel:09xxxxxxxxx" 
            className="inline-flex items-center justify-center w-full md:w-auto bg-blue-600 text-white py-3 px-6 rounded-lg font-bold transition-transform transform hover:scale-[1.02] hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300"
          >
            <Phone className="w-4 h-4 mr-2" />
            โทรเลย
          </a>
        </div>

        {/* Email Form Card */}
        <div className="flex-1 min-w-[300px] bg-white rounded-xl p-6 shadow-lg border border-gray-100 transition-shadow hover:shadow-xl">
          <div className="flex items-center text-blue-600 mb-4">
            <Mail className="w-6 h-6 mr-3" />
            <h2 className="text-xl font-semibold">อีเมลติดต่อเรา</h2>
          </div>
          <p className="text-gray-600 mb-4">รายงานปัญหา, ข้อเสนอแนะ หรือคำถามทั่วไป</p>
          
          {submitMessage && (
            <div className={`p-3 mb-4 rounded-lg border ${submitMessage.type === 'success' ? 'bg-green-100 border-green-400 text-green-700' : 'bg-red-100 border-red-400 text-red-700'}`}>
              {submitMessage.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
            <input 
              type="text" 
              name="name" 
              placeholder="ชื่อของคุณ" 
              value={formData.name}
              onChange={handleChange}
              required 
              className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
            />
            <input 
              type="email" 
              name="email" 
              placeholder="อีเมล" 
              value={formData.email}
              onChange={handleChange}
              required 
              className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
            />
            <input 
              type="text" 
              name="subject" 
              placeholder="หัวข้อ" 
              value={formData.subject}
              onChange={handleChange}
              required 
              className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
            />
            <textarea 
              name="message" 
              placeholder="ข้อความ" 
              rows={5}
              value={formData.message}
              onChange={handleChange}
              required 
              className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition duration-150"
            ></textarea>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="flex items-center justify-center bg-blue-600 text-white py-3 px-6 rounded-lg font-bold transition-all duration-300 hover:bg-blue-700 space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>กำลังส่ง...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>ส่งข้อความ</span>
                </>
              )}
            </button>
          </form>
        </div>
        
      </div>
      
    </div>
  );
};

export default Contact;
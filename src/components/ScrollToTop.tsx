import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
    // ใช้ useLocation เพื่อติดตามการเปลี่ยนแปลง URL
    const { pathname, search } = useLocation();

    useEffect(() => {
        // เมื่อมี pathname หรือ search เปลี่ยนแปลง, หน้าจอจะเลื่อนขึ้นบนสุด
        window.scrollTo(0, 0);

        // หมายเหตุ: ถ้าคุณใช้ hash links (#section) คุณอาจต้องเพิ่มเงื่อนไข `if (window.location.hash)` เพื่อหลีกเลี่ยงการเลื่อน
    }, [pathname, search]);

    // คอมโพเนนต์นี้ไม่มีการเรนเดอร์อะไรออกมา (return null)
    return null;
};

export default ScrollToTop;
// ต้อง import useTranslation จาก react-i18next
import { useTranslation } from 'react-i18next';

const Footer = () => {
    // 2. เรียกใช้ Hook useTranslation
    const { t } = useTranslation();
    
    // ตรวจสอบให้แน่ใจว่าคีย์ที่ใช้ตรงกับ th.json ที่เราสร้างไว้ก่อนหน้า
    
    const currentYear = new Date().getFullYear();

    return (
        <footer
            // Mobile: p-6 (px-6 py-8) | Desktop: pt-10
            className="bg-gray-50 pt-8 pb-4 border-t border-gray-200 mt-10"
        >
            <div
                // Container and Padding
                className="max-w-7xl mx-auto px-6 lg:px-8"
            >
                {/* Main Grid Section */}
                <div
                    // RESPONSIVE UPGRADE: 2 columns on small/medium screens, 4 on large screens
                    className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10"
                >
                    {/* Section 1: Branding and Description (Full width on very small screens, 1 col on mobile grid) */}
                    <div className="col-span-2 lg:col-span-1">
                        <h2
                            className="font-bold text-xl text-gray-900 mb-3"
                        >
                            {/* แก้ไขคีย์ translation เป็น "footer.brand_uni" */}
                            {t("footer.brand_unifooter")}
                            <span className="text-blue-500">{t("footer.brand_trade")}</span>
                        </h2>
                        <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
                            {t("footer.description")}
                        </p>
                    </div>

                    {/* Section 2: Quick Links */}
                    <div>
                        <h3
                            className="font-semibold text-base text-gray-900 mb-3"
                        >
                            {t("footer.quick_links")}
                        </h3>
                        <ul className="list-none p-0 text-sm space-y-2">
                            <li>
                                <a href="/Browse" className="text-gray-600 hover:text-blue-500 transition duration-150">
                                    {t("browse")}
                                </a>
                            </li>
                            <li>
                                <a href="/Dashboard" className="text-gray-600 hover:text-blue-500 transition duration-150">
                                    {t("dashboard")}
                                </a>
                            </li>
                            <li>
                                <a href="/about" className="text-gray-600 hover:text-blue-500 transition duration-150">
                                    {t("footer.about_us")}
                                </a>
                            </li>
                            <li>
                                <a href="/contact" className="text-gray-600 hover:text-blue-500 transition duration-150">
                                    {t("contact")}
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Section 3: Support */}
                    <div>
                        <h3
                            className="font-semibold text-base text-gray-900 mb-3"
                        >
                            {t("footer.support")}
                        </h3>
                        <ul className="list-none p-0 text-sm space-y-2">
                            <li>
                                <a href="/faq" className="text-gray-600 hover:text-blue-500 transition duration-150">
                                    {t("footer.faq")}
                                </a>
                            </li>
                            <li>
                                <a href="/help" className="text-gray-600 hover:text-blue-500 transition duration-150">
                                    {t("footer.help_center")}
                                </a>
                            </li>
                            <li>
                                <a href="/privacy" className="text-gray-600 hover:text-blue-500 transition duration-150">
                                    {t("footer.privacy_policy")}
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Section 4: Newsletter */}
                    <div>
                        <h3
                            className="font-semibold text-base text-gray-900 mb-3"
                        >
                            {t("footer.stay_updated")}
                        </h3>
                        <p className="text-sm text-gray-500 mb-3">
                            {t("footer.newsletter_description")}
                        </p>
                        <div className="flex gap-2">
                            <input
                                type="email"
                                placeholder={t("footer.email_placeholder")}
                                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-blue-500 focus:border-blue-500"
                            />
                            <button
                                className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded-lg text-sm transition duration-150"
                            >
                                {t("footer.subscribe_button")}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="border-t border-gray-200 mt-6 pt-4 text-center text-sm text-gray-500">
                    © {currentYear} {t("footer.copyright")}
                </div>
            </div>
        </footer>
    );
};

export default Footer;
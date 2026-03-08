import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Contract } from '../types';
import { formatCurrency } from './utils';

export const generateContractPDF = async (contract: Contract) => {
  // Create a hidden container for the contract template
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '800px';
  container.style.backgroundColor = 'white';
  container.style.color = 'black';
  container.style.padding = '60px 80px';
  container.style.fontFamily = "'Times New Roman', Times, serif";
  container.style.fontSize = '14px';
  container.style.lineHeight = '1.5';

  const now = new Date();
  const title = contract.property_listing_type === 'Thuê' 
    ? 'HỢP ĐỒNG CHO THUÊ CĂN HỘ CHUNG CƯ' 
    : 'HỢP ĐỒNG MUA BÁN CĂN HỘ CHUNG CƯ';

  container.innerHTML = `
    <div style="text-align: right; font-weight: bold; margin-bottom: 20px;">Mẫu số 01</div>
    
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="font-weight: bold; font-size: 16px; text-transform: uppercase;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
      <div style="font-weight: bold; font-size: 14px;">Độc lập - Tự do - Hạnh phúc</div>
      <div style="margin: 5px auto; width: 150px; border-bottom: 1px solid black;"></div>
    </div>

    <div style="text-align: center; font-style: italic; margin-bottom: 30px;">
      ........, ngày ${now.getDate()} tháng ${now.getMonth() + 1} năm ${now.getFullYear()}
    </div>

    <div style="text-align: center; margin-bottom: 40px;">
      <div style="font-weight: bold; font-size: 18px; margin-bottom: 5px;">${title}</div>
      <div style="font-weight: bold;">Số: HD${String(contract.id).padStart(4, '0')}/2026</div>
    </div>

    <div style="margin-bottom: 20px;">
      <p>Căn cứ Bộ luật Dân sự ngày 24 tháng 11 năm 2015;</p>
      <p>Căn cứ Luật Kinh doanh bất động sản ngày 25 tháng 11 năm 2014;</p>
      <p>Căn cứ Luật Nhà ở ngày 25 tháng 11 năm 2014;</p>
      <p>Căn cứ các văn bản, hồ sơ pháp lý dự án, căn hộ chung cư: ....................................................................</p>
    </div>

    <div style="font-style: italic; margin-bottom: 15px;">Các Bên dưới đây gồm:</div>

    <div style="margin-bottom: 25px;">
      <div style="font-weight: bold; text-transform: uppercase; margin-bottom: 10px;">
        I. BÊN ${contract.property_listing_type === 'Thuê' ? 'CHO THUÊ' : 'BÁN'} (Bên A):
      </div>
      <div style="padding-left: 20px;">
        <p>- Tên tổ chức, cá nhân: <strong>CÔNG TY BẤT ĐỘNG SẢN BDS PRO</strong></p>
        <p>- Giấy chứng nhận đăng ký kinh doanh số: 0123456789</p>
        <p>- Người đại diện theo pháp luật: <strong>NGUYỄN VĂN QUẢN LÝ</strong> &nbsp;&nbsp;&nbsp;&nbsp; Chức vụ: Giám đốc</p>
        <p>- Địa chỉ: Tòa nhà Bitexco, Quận 1, TP. Hồ Chí Minh</p>
        <p>- Điện thoại liên hệ: 1900 1234</p>
      </div>
    </div>

    <div style="margin-bottom: 25px;">
      <div style="font-weight: bold; text-transform: uppercase; margin-bottom: 10px;">
        II. BÊN ${contract.property_listing_type === 'Thuê' ? 'THUÊ' : 'MUA'} (Bên B):
      </div>
      <div style="padding-left: 20px;">
        <p>- Tên cá nhân: <strong>${contract.customer_name || '....................................................................'}</strong></p>
        <p>- Số CCCD/Hộ chiếu: ${contract.customer_nationalId || '....................................................................'}</p>
        <p>- Địa chỉ: ${contract.customer_address || '....................................................................'}</p>
        <p>- Điện thoại liên hệ: ${contract.customer_phone || '....................................................................'}</p>
      </div>
    </div>

    <div style="margin-bottom: 25px;">
      <div style="font-weight: bold; text-transform: uppercase; margin-bottom: 10px;">III. THÔNG TIN BẤT ĐỘNG SẢN:</div>
      <div style="padding-left: 20px;">
        <p>- Tên căn hộ/Dự án: <strong>${contract.property_title}</strong></p>
        <p>- Vị trí: ${contract.property_location}</p>
        <p>- Diện tích: ${contract.property_area} m²</p>
        <p>- Loại hình: ${contract.property_type}</p>
      </div>
    </div>

    <div style="margin-bottom: 40px;">
      <div style="font-weight: bold; text-transform: uppercase; margin-bottom: 10px;">IV. GIÁ TRỊ VÀ PHƯƠNG THỨC THANH TOÁN:</div>
      <div style="padding-left: 20px;">
        <p>- Tổng giá trị hợp đồng: <strong>${formatCurrency(contract.total_value)}</strong></p>
        <p>- Hình thức giao dịch: ${contract.property_listing_type}</p>
      </div>
    </div>

    <div style="display: flex; justify-content: space-around; margin-top: 50px; text-align: center;">
      <div>
        <div style="font-weight: bold; text-transform: uppercase;">ĐẠI DIỆN BÊN A</div>
        <div style="font-style: italic; font-size: 12px;">(Ký, ghi rõ họ tên và đóng dấu)</div>
        <div style="margin-top: 80px; font-weight: bold;">NGUYỄN VĂN QUẢN LÝ</div>
      </div>
      <div>
        <div style="font-weight: bold; text-transform: uppercase;">ĐẠI DIỆN BÊN B</div>
        <div style="font-style: italic; font-size: 12px;">(Ký, ghi rõ họ tên)</div>
        <div style="margin-top: 80px; font-weight: bold;">${contract.customer_name || ''}</div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2, // Higher scale for better quality
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    
    const finalWidth = imgWidth * ratio;
    const finalHeight = imgHeight * ratio;
    
    const x = (pdfWidth - finalWidth) / 2;
    const y = 0; // Start from top

    pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
    pdf.save(`HopDong_${contract.id}.pdf`);
  } catch (error) {
    console.error('Error generating PDF:', error);
  } finally {
    document.body.removeChild(container);
  }
};

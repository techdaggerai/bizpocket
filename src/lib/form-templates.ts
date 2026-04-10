export interface FormTemplateField {
  number: number;
  label_jp: string;
  label_en: string;
  explanation: string;
  example: string;
  format: string | null;
  cultural_note: string | null;
}

export interface FormTemplate {
  id: string;
  icon: string;
  title_jp: string;
  title_en: string;
  fields: FormTemplateField[];
}

export const FORM_TEMPLATES: FormTemplate[] = [
  {
    id: 'bank-transfer',
    icon: '\uD83C\uDFE6',
    title_jp: '振込用紙',
    title_en: 'Bank Transfer Form',
    fields: [
      { number: 1, label_jp: '振込先 口座番号', label_en: 'Recipient Account Number', explanation: 'The bank account number you are sending money to', example: '1234567', format: '7 digits', cultural_note: null },
      { number: 2, label_jp: '振込先 口座名義', label_en: 'Recipient Account Name', explanation: 'Name of the account holder you are transferring to — must match exactly', example: 'タナカ タロウ', format: 'Katakana (full-width)', cultural_note: 'Japanese banks require katakana for account names. Ask the recipient for the exact spelling.' },
      { number: 3, label_jp: '金融機関名', label_en: 'Bank Name', explanation: 'Name of the recipient\'s bank', example: '三菱UFJ銀行', format: null, cultural_note: null },
      { number: 4, label_jp: '支店名', label_en: 'Branch Name', explanation: 'Branch of the recipient\'s bank', example: '渋谷支店', format: null, cultural_note: null },
      { number: 5, label_jp: '金額', label_en: 'Amount', explanation: 'Transfer amount in yen', example: '¥50,000', format: 'Numbers only, no commas in some forms', cultural_note: null },
      { number: 6, label_jp: '依頼人名', label_en: 'Sender Name (Your Name)', explanation: 'Your name as the person sending the transfer', example: 'ジョン スミス', format: 'Katakana', cultural_note: 'Foreign names should be written in katakana. If unsure, ask your bank for the registered katakana.' },
      { number: 7, label_jp: '依頼人 電話番号', label_en: 'Sender Phone Number', explanation: 'Your phone number for contact', example: '090-1234-5678', format: 'With hyphens', cultural_note: null },
    ],
  },
  {
    id: 'address-change',
    icon: '\uD83D\uDCE6',
    title_jp: '転居届',
    title_en: 'Address Change (Post Office)',
    fields: [
      { number: 1, label_jp: '届出年月日', label_en: 'Filing Date', explanation: 'Today\'s date when you submit this form', example: '令和8年4月10日', format: 'Japanese era year (令和) + month + day', cultural_note: '2026 = 令和8年. Japanese forms use the era calendar, not Western years.' },
      { number: 2, label_jp: '旧住所', label_en: 'Previous Address', explanation: 'Your old address you are moving FROM', example: '東京都渋谷区神宮前1-2-3', format: 'Prefecture → City → District → Block', cultural_note: 'Write the full address including apartment name and room number.' },
      { number: 3, label_jp: '新住所', label_en: 'New Address', explanation: 'Your new address you are moving TO', example: '東京都新宿区西新宿4-5-6', format: 'Same format as above', cultural_note: null },
      { number: 4, label_jp: '届出人 氏名', label_en: 'Applicant Name', explanation: 'Your full name', example: '田中 太郎', format: null, cultural_note: 'If you have a foreign name, write it in katakana with furigana if there\'s a furigana field.' },
      { number: 5, label_jp: '転送開始希望日', label_en: 'Mail Forwarding Start Date', explanation: 'Date from which you want mail forwarded to your new address', example: '令和8年5月1日', format: 'Japanese era date', cultural_note: 'Mail forwarding lasts 1 year and is free.' },
    ],
  },
  {
    id: 'residence-card',
    icon: '\uD83C\uDDF1',
    title_jp: '在留カード更新',
    title_en: 'Residence Card Renewal',
    fields: [
      { number: 1, label_jp: '国籍・地域', label_en: 'Nationality / Region', explanation: 'Your country of citizenship', example: 'アメリカ合衆国', format: 'In Japanese (katakana for country name)', cultural_note: null },
      { number: 2, label_jp: '氏名', label_en: 'Full Name', explanation: 'Your full name as shown on your passport', example: 'SMITH JOHN', format: 'Uppercase Roman letters, surname first', cultural_note: 'Must match your passport exactly.' },
      { number: 3, label_jp: '生年月日', label_en: 'Date of Birth', explanation: 'Your date of birth', example: '1990年5月15日', format: 'YYYY年MM月DD日', cultural_note: null },
      { number: 4, label_jp: '性別', label_en: 'Gender', explanation: 'Check male (男) or female (女)', example: '男', format: 'Checkbox', cultural_note: null },
      { number: 5, label_jp: '在留資格', label_en: 'Status of Residence', explanation: 'Your visa type', example: '技術・人文知識・国際業務', format: null, cultural_note: 'Copy this exactly from your current residence card.' },
      { number: 6, label_jp: '在留期間', label_en: 'Period of Stay', explanation: 'Duration of your visa', example: '3年', format: null, cultural_note: null },
      { number: 7, label_jp: '住居地', label_en: 'Address in Japan', explanation: 'Your registered address in Japan', example: '東京都渋谷区神宮前1-2-3', format: 'Full Japanese address', cultural_note: 'Must match the address registered at city hall.' },
    ],
  },
  {
    id: 'city-hall',
    icon: '\uD83C\uDFDB\uFE0F',
    title_jp: '住民届',
    title_en: 'City Hall Registration',
    fields: [
      { number: 1, label_jp: '届出日', label_en: 'Filing Date', explanation: 'Date you are submitting this form', example: '令和8年4月10日', format: 'Japanese era year', cultural_note: null },
      { number: 2, label_jp: '届出人 氏名', label_en: 'Applicant Name', explanation: 'Your full legal name', example: 'ジョン スミス', format: 'Katakana for foreign names', cultural_note: 'Bring your residence card and passport.' },
      { number: 3, label_jp: 'フリガナ', label_en: 'Furigana (Name Reading)', explanation: 'Phonetic reading of your name in katakana', example: 'ジョン スミス', format: 'Katakana only', cultural_note: 'Furigana is required on most Japanese forms. It shows how to read your name.' },
      { number: 4, label_jp: '生年月日', label_en: 'Date of Birth', explanation: 'Your date of birth', example: '平成2年5月15日', format: 'Japanese era year', cultural_note: '1990 = 平成2年. Use a converter if unsure.' },
      { number: 5, label_jp: '新住所', label_en: 'New Address', explanation: 'The address you are registering at', example: '東京都新宿区西新宿4-5-6 マンション名 101号室', format: 'Full address with apartment and room', cultural_note: null },
      { number: 6, label_jp: '世帯主との続柄', label_en: 'Relationship to Head of Household', explanation: 'Your relationship to the main person in the household', example: '本人 (self)', format: null, cultural_note: 'If you live alone, write 本人 (self/principal). If with spouse, write 妻 (wife) or 夫 (husband).' },
    ],
  },
  {
    id: 'insurance-claim',
    icon: '\uD83D\uDCCB',
    title_jp: '保険請求書',
    title_en: 'Insurance Claim Form',
    fields: [
      { number: 1, label_jp: '被保険者証番号', label_en: 'Insurance Card Number', explanation: 'Your health insurance card number', example: '12345678', format: 'Numbers from your insurance card', cultural_note: 'Found on the front of your 健康保険証 (health insurance card).' },
      { number: 2, label_jp: '被保険者 氏名', label_en: 'Insured Person Name', explanation: 'Name of the person covered by insurance', example: 'ジョン スミス', format: 'Katakana', cultural_note: null },
      { number: 3, label_jp: '傷病名', label_en: 'Name of Illness/Injury', explanation: 'What condition you are claiming for', example: '骨折 (fracture)', format: null, cultural_note: 'Your doctor will provide this — copy from your medical certificate (診断書).' },
      { number: 4, label_jp: '療養期間', label_en: 'Treatment Period', explanation: 'Date range of treatment', example: '令和8年3月1日 〜 令和8年3月15日', format: 'Start date 〜 End date', cultural_note: null },
      { number: 5, label_jp: '請求金額', label_en: 'Claim Amount', explanation: 'Amount you are requesting reimbursement for', example: '¥15,000', format: 'Yen amount', cultural_note: 'Attach all receipts (領収書). Japan\'s NHI covers 70% — you claim the remaining 30% here.' },
      { number: 6, label_jp: '振込口座', label_en: 'Bank Account for Payment', explanation: 'Your bank details for receiving the claim payment', example: '三菱UFJ銀行 渋谷支店 普通 1234567', format: 'Bank, branch, account type (普通=savings), number', cultural_note: null },
    ],
  },
  {
    id: 'apartment-contract',
    icon: '\uD83C\uDFE0',
    title_jp: '賃貸契約書',
    title_en: 'Apartment Contract',
    fields: [
      { number: 1, label_jp: '賃借人 氏名', label_en: 'Tenant Name', explanation: 'Your full legal name as the renter', example: 'ジョン スミス', format: 'Katakana for foreign names', cultural_note: null },
      { number: 2, label_jp: '連帯保証人', label_en: 'Guarantor', explanation: 'Your guarantor\'s name and contact — required for most rentals', example: '山田 花子', format: null, cultural_note: 'Most landlords require a Japanese guarantor or a guarantor company (保証会社). Ask your real estate agent about guarantor services if you don\'t know a Japanese guarantor.' },
      { number: 3, label_jp: '賃料', label_en: 'Monthly Rent', explanation: 'The monthly rent amount', example: '¥85,000', format: 'Yen', cultural_note: null },
      { number: 4, label_jp: '敷金', label_en: 'Security Deposit', explanation: 'Refundable deposit (usually 1-2 months rent)', example: '¥85,000', format: 'Yen', cultural_note: '敷金 is refundable. 礼金 (key money) is NOT refundable — this is a Japanese custom, essentially a gift to the landlord.' },
      { number: 5, label_jp: '契約期間', label_en: 'Lease Period', explanation: 'Duration of the rental contract', example: '令和8年5月1日 〜 令和10年4月30日', format: 'Start 〜 End date', cultural_note: 'Standard leases in Japan are 2 years. Renewal fee (更新料) of 1 month rent is common.' },
      { number: 6, label_jp: '緊急連絡先', label_en: 'Emergency Contact', explanation: 'Emergency contact person (cannot be yourself)', example: '田中太郎 090-1234-5678', format: 'Name + phone number', cultural_note: 'Must be someone in Japan who can be reached. Some landlords require a Japanese national.' },
      { number: 7, label_jp: '印鑑 / 署名', label_en: 'Seal / Signature', explanation: 'Your personal seal stamp (hanko) or signature', example: 'スミス', format: null, cultural_note: 'Foreigners can usually use a signature instead of a hanko. Some landlords may require a registered seal (実印) from city hall — ask before signing.' },
    ],
  },
];

# Beşli Patron — Gizlilik Politikası Taslağı (YAYINA HAZIR DEĞİL)

> Bu dosya çalışma taslağıdır; App Store Connect'e veya kullanıcılara yayımlanmamalıdır. Yayından önce veri akışları doğrulanmalı, veri sorumlusu/yayıncı bilgileri ve geçerli iletişim adresi eklenmeli, reklam SDK'sının gerçek yapılandırmasıyla karşılaştırılmalıdır.

**Son gözden geçirme:** 13 Ekim 2026  
**Uygulama:** Beşli Patron  
**Paket kimliği:** `com.sardurtechnologies.beslipatron`  
**Veri sorumlusu / yayıncı:** [YAYINCI ADI VE HUKUKİ BİLGİLER EKLENECEK]  
**İletişim:** serhattutak2@gmail.com

## 1. Kapsam

Bu politika, Beşli Patron mobil uygulamasının oyun verilerini nasıl sakladığını ve uygulamada kullanılan üçüncü taraf reklam hizmetlerinin verileri nasıl işleyebileceğini açıklamak için hazırlanmış bir taslaktır.

## 2. Cihazda saklanan oyun verileri

İncelenen uygulama kodunda oyun durumu, cihazdaki yerel depolama alanı (`AsyncStorage`) üzerinden kaydedilmektedir. Oyuncunun oyun ilerlemesi, oyun içi değerleri ve benzeri kayıtlı durum bilgileri bu amaçla cihazda tutulabilir. Uygulama içindeki tanı modülü ayrıca son hata bilgisi ve sınırlı işlem günlüğünü yerel depolamada saklayabilir.

Bu incelemede uygulama kodundan bir kullanıcı hesabı veya uygulama sunucusuna oyun kaydı gönderimi tespit edilmemiştir. Bu ifade, üçüncü taraf SDK'ların ağ trafiği veya işletim sistemi düzeyindeki veri işleme faaliyetlerinin bulunmadığı anlamına gelmez.

## 3. Reklam hizmetleri

Uygulamada Google Mobile Ads SDK kullanılmaktadır. Reklam sağlayıcısı, reklam sunma, sıklık sınırlarını uygulama, dolandırıcılığı önleme, ölçümleme ve ilgili hizmetleri sağlama amacıyla cihaz bilgileri, reklam tanımlayıcıları, IP adresi, tanılama bilgileri ve reklam etkileşimleri gibi verileri kendi belgeleri ve kullanıcının cihaz/izin ayarları kapsamında işleyebilir.

Bu taslak, uygulamanın kişiselleştirilmiş reklam gösterip göstermediği veya izleme izni isteyip istemediği konusunda kesin bir beyanda bulunmaz. Yayından önce SDK'nın gerçek davranışı, iOS App Tracking Transparency yapılandırması, varsa rıza akışı ve Google'ın veri açıklamaları doğrulanmalıdır.

Google kaynakları:
- Google Gizlilik Politikası: https://policies.google.com/privacy
- Google reklamları hakkında: https://policies.google.com/technologies/ads
- Google Mobile Ads SDK veri açıklamaları: https://developers.google.com/admob/ios/privacy/data-disclosure

## 4. Verilerin kullanımı ve paylaşımı

Oyun verileri oyun ilerlemesini kaydetmek ve uygulamanın temel işlevlerini sağlamak amacıyla cihazda saklanır. Reklam hizmeti kapsamında gerekli veriler Google ve ilgili hizmet sağlayıcıları tarafından kendi hizmetlerini sunmak, güvenliği sağlamak ve ölçümleme yapmak için işlenebilir. Kesin paylaşım kapsamı, kullanılan SDK sürümü ve etkin reklam/izin ayarlarıyla doğrulanmalıdır.

## 5. Saklama ve silme

Cihazda tutulan oyun kayıtları, uygulamanın kayıt/sıfırlama işlevleri veya uygulamanın cihazdan kaldırılması gibi durumlara bağlı olarak silinebilir. İşletim sistemi yedekleri ve üçüncü taraf sağlayıcıların kendi kayıtları farklı saklama kurallarına tabi olabilir. Bu bölüm, yayın öncesi gerçek davranış ve sağlayıcı belgeleriyle doğrulanmalıdır.

## 6. Çocukların gizliliği

Uygulamanın hedef yaş kitlesi ve çocuklara yönelik olup olmadığı yayın öncesi belirlenmelidir. Uygulama çocuklara yönelikse reklam SDK'sı, yaş derecelendirmesi, hedef kitle beyanları ve yürürlükteki çocuk gizliliği kuralları ayrıca değerlendirilmelidir. Bu taslak, uygulamanın çocuklara yönelik olmadığını varsaymaz.

## 7. Güvenlik

Uygulama içindeki yerel kayıtlar cihazın depolama ve işletim sistemi güvenlik mekanizmalarına tabidir. Hiçbir elektronik depolama veya aktarım yönteminin mutlak güvenlik sağlayacağı garanti edilemez.

## 8. Kullanıcı hakları ve iletişim

Gizlilikle ilgili talepler, sorular veya yürürlükteki mevzuat kapsamındaki başvurular için yayıncının doğrulanmış iletişim adresi burada yayımlanmalıdır: serhattutak2@gmail.com.

## 9. Değişiklikler

Bu politika güncellendiğinde yürürlük tarihi ve yapılan değişiklikler yayımlanan sürümde belirtilmelidir.

---

## Yayından önce tamamlanması zorunlu kontroller

- [ ] Yayıncı/veri sorumlusu adı ve gerekli hukuki bilgiler eklenmeli. İletişim e-postası eklendi: serhattutak2@gmail.com.
- [ ] Google Mobile Ads SDK veri işleme ve reklam kişiselleştirme ayarları doğrulanmalı.
- [ ] iOS izleme/ATT izni ve varsa rıza ekranı davranışı doğrulanmalı.
- [ ] App Store Connect “App Privacy” beyanları, SDK davranışıyla eşleştirilmeli.
- [ ] Hedef yaş kitlesi ve çocuklara yönelik içerik durumu belirlenmeli.
- [ ] Metin, herkese açık ve kalıcı bir gizlilik politikası URL'sinde yayımlanmalı.
- [ ] App Store ürün sayfasına gizlilik politikası ve destek URL'leri girilmeli.

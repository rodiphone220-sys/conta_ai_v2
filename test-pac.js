import fetch from 'node-fetch';

const endpoint = 'https://testing.solucionfactible.com/ws/services/Timbrado';

const soapRequest = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ws="http://timbrado.ws.cfdi.solucionfactible.com">
  <soapenv:Header/>
  <soapenv:Body>
    <ws:timbrar>
      <ws:usuario>testing@solucionfactible.com</ws:usuario>
      <ws:password>timbrado.SF.16672</ws:password>
      <ws:cfdiBase64>PCFET0NUWVBFIHN2YyxyPjxjZnYyOENGRiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9jZmQvMy4wIiBWZXJzaW9uPSIzLjAjIj48a2luZiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9jZmQvMy4wIiB0ZXN0PSIxIj48Q0ZGSSBTZXJpZU49IjEyMzQ1Njc4OTAiPjxFbWlzb3IgUlBDPSIxMjM0NTY3ODkwIiBOb21icmVuPSJURVNUIj48UmVjaXBpZW50ZSBSUEM9IlRFU1QyMCIgTm9tYnJlPSJURVNUIj48Q29uY2VwdG8gQ3VyclRyYW5zZmVyZW50ZT0iMCIgRGlzY3VlbnRhPSIxMDAiIElVU09SPSIxLjIiPjxJbXB1ZXN0bz48SW1wSW1wbnQ+DQogIDxEaW1wdG9SZWY+TjA8L0RpbXB0b1JlZj4NCiAgPENhbnRpZGFkPkhvbGEgQ2FudGlkYWQ8L0NhbnRpZGFkPg0KICA8TW9uZWRhUj4xMi40PC9Nb25lZGFSPg0KICA8VG90YWw+MTIuNDwvVG90YWw+DQogIDxNZXRpb2RvVHJhbnNmZXJlbnRlPlllczwvTWV0b2RvVHJhbnNmZXJlbnRlPg0KICA8VGllem9SZWY+MzwvVGllem9SZWY+DQogIDxJbXB1ZXN0bz4NCiAgPC9JbXB1ZXN0bz4NCjwvQ29uY2VwdG8+PC9SZWNpcGllbnRlPjxFbWlzb3IgUlBDPSIxMjM0NTY3ODkwIj48Q29uY2VwdG8gQ3VyllRyYW5zZmVyZW50ZT0iMCIgRGlzY3VlbnRhPSIxMDAiIElVU09SPSIxLjIiPjxJbXB1ZXN0bz48SW1wSW1wbnQ+DQogIDxEaW1wdG9SZWY+TjA8L0RpbXB0b1JlZj4NCiAgPENhbnRpZGFkPkhvbGEgQ2FudGlkYWQ8L0NhbnRpZGFkPg0KICA8TW9uZWRhUj4xMi40PC9Nb25lZGFSPg0KICA8VG90YWw+MTIuNDwvVG90YWw+DQogIDxNZXRpb2RvVHJhbnNmZXJlbnRlPlllczwvTWV0b2RvVHJhbnNmZXJlbnRlPg0KICA8VGllem9SZWY+MzwvVGllem9SZWY+DQogIDxJbXB1ZXN0bz4NCiAgPC9JbXB1ZXN0bz4NCjwvQ29uY2VwdG8+PC9FbWlzb3I+PFRyYW5zZmVyZW5jaWEgVHlwZUNmZGlDbGllbnRlPSJQdWFnbyIgUGFnbz0iMDAwMCIgRm9ybWFDdTAwMT0iMTIgMjQgMjAyNSI+DQo8L1RyYW5zZmVyZW5jaWE+PC9LRU5GPjwvQ0ZGST48L0tJTkY+PC9DRkZSPg==</ws:cfdiBase64>
    </ws:timbrar>
  </soapenv:Body>
</soapenv:Envelope>`;

async function test() {
  try {
    console.log('Enviando request...');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '',
        'SOAPAction': ''
      },
      body: soapRequest
    });

    console.log('Status:', response.status, response.statusText);
    const text = await response.text();
    console.log('Response:', text);
  } catch (error) {
    console.error('Error:', error);
  }
}

test();

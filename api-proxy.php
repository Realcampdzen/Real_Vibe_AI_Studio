<?php
/**
 * API Proxy for NeuroValyusha Chat
 * Проксирует запросы к Cloudflare Pages API для обхода блокировок pages.dev
 * 
 * Разместите этот файл в корне сайта на NIC.RU
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// Target API endpoint
$targetUrl = 'https://real-vibe-ai-studio.pages.dev/api/valyusha/chat';

// Get request body
$requestBody = file_get_contents('php://input');

// Validate JSON
$jsonData = json_decode($requestBody, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON: ' . json_last_error_msg()]);
    exit;
}

// Initialize cURL
$ch = curl_init($targetUrl);

// cURL options - максимально агрессивные настройки для обхода ограничений NIC.RU
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $requestBody,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'Origin: https://real-vibe.studio',
        'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept: application/json',
        'Accept-Language: ru-RU,ru;q=0.9,en;q=0.8',
        'Cache-Control: no-cache'
    ],
    CURLOPT_TIMEOUT => 60,
    CURLOPT_CONNECTTIMEOUT => 20,
    // SSL: полностью отключаем проверку для обхода проблем на NIC.RU
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_MAXREDIRS => 0,
    // Принудительно используем TLS 1.2+
    CURLOPT_SSLVERSION => CURL_SSLVERSION_TLSv1_2,
    // Дополнительные опции для стабильности
    CURLOPT_TCP_KEEPALIVE => 1,
    CURLOPT_TCP_KEEPIDLE => 60,
    CURLOPT_TCP_KEEPINTVL => 30,
    // Отключаем компрессию (может вызывать проблемы)
    CURLOPT_ENCODING => '',
    // Используем IPv4 (может быть проблема с IPv6)
    CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4
]);

// Execute request
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
$curlErrno = curl_errno($ch);

curl_close($ch);

// Handle cURL errors
if ($response === false || $curlErrno !== 0) {
    http_response_code(502);
    error_log("API Proxy cURL error: [$curlErrno] $curlError");
    echo json_encode([
        'error' => 'Proxy connection failed',
        'details' => $curlError ?: 'Unknown error'
    ]);
    exit;
}

// Forward HTTP status code
http_response_code($httpCode);

// Return response as-is (it should already be JSON)
echo $response;
?>

<?php
/**
 * Olzinger Haustechnik – Versand des Kontaktformulars
 *
 * Wird per fetch() aus assets/js/contact.js aufgerufen und antwortet mit JSON.
 * Ist PHP auf dem Server nicht verfügbar, öffnet das Formular automatisch das
 * E-Mail-Programm des Besuchers (Fallback in contact.js).
 *
 * Schutzmaßnahmen: Honeypot-Feld, Mindest-Ausfüllzeit, Längenbegrenzung,
 * Validierung der E-Mail-Adresse (verhindert Header-Injection über Reply-To),
 * kodierter Betreff und feste Empfängeradresse.
 */

declare(strict_types=1);

const RECIPIENT = 'kontakt@olzinger.de';
// Absender sollte eine Adresse der eigenen Domain sein (SPF/DKIM), sonst landen Mails im Spam.
const SENDER = 'kontakt@olzinger.de';
const MIN_SECONDS = 3;

date_default_timezone_set('Europe/Berlin');
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function respond(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function field(string $key, int $max): string
{
    $value = isset($_POST[$key]) && is_string($_POST[$key]) ? trim($_POST[$key]) : '';
    $value = str_replace(["\r\n", "\r"], "\n", $value);
    // Steuerzeichen außer Zeilenumbruch und Tab entfernen
    $value = preg_replace('/[^\P{C}\n\t]/u', '', $value) ?? '';
    return function_exists('mb_substr') ? mb_substr($value, 0, $max, 'UTF-8') : substr($value, 0, $max);
}

function single_line(string $value): string
{
    return trim(preg_replace('/\s+/u', ' ', $value) ?? '');
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    respond(405, ['ok' => false, 'error' => 'method_not_allowed']);
}

// Honeypot: echte Besucher sehen dieses Feld nicht.
if (field('website', 200) !== '') {
    respond(200, ['ok' => true]);
}

// Zeitfalle: Bots senden Formulare meist sofort ab.
$started = (int) ($_POST['ts'] ?? 0);
if ($started > 0 && (microtime(true) * 1000 - $started) < MIN_SECONDS * 1000) {
    respond(200, ['ok' => true]);
}

$name    = single_line(field('name', 120));
$email   = single_line(field('email', 200));
$phone   = single_line(field('phone', 60));
$place   = single_line(field('place', 120));
$topic   = single_line(field('topic', 120));
$message = field('message', 5000);
$privacy = !empty($_POST['privacy']);

$errors = [];
if ($name === '') {
    $errors[] = 'name';
}
if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    $errors[] = 'email';
}
if ((function_exists('mb_strlen') ? mb_strlen($message, 'UTF-8') : strlen($message)) < 5) {
    $errors[] = 'message';
}
if (!$privacy) {
    $errors[] = 'privacy';
}
if ($errors) {
    respond(422, ['ok' => false, 'errors' => $errors]);
}

$subject = 'Anfrage über olzinger.de' . ($topic !== '' ? ' – ' . $topic : '');
$body = implode("\n", [
    'Neue Anfrage über das Kontaktformular auf olzinger.de',
    '',
    'Anliegen:  ' . ($topic !== '' ? $topic : '–'),
    'Name:      ' . $name,
    'E-Mail:    ' . $email,
    'Telefon:   ' . ($phone !== '' ? $phone : '–'),
    'PLZ / Ort: ' . ($place !== '' ? $place : '–'),
    '',
    'Nachricht:',
    $message,
    '',
    '—',
    'Gesendet am ' . date('d.m.Y') . ' um ' . date('H:i') . ' Uhr',
]);

$headers = implode("\r\n", [
    'From: Website Olzinger <' . SENDER . '>',
    'Reply-To: ' . $email,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: olzinger.de',
]);

$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
$sent = @mail(RECIPIENT, $encodedSubject, $body, $headers, '-f' . SENDER);

respond($sent ? 200 : 500, ['ok' => (bool) $sent]);

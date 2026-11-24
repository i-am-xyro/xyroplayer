<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
$q = trim($_GET['q'] ?? '');
if ($q === '') { http_response_code(400); echo json_encode(['error'=>'Digite algo para pesquisar.']); exit; }
$key = getenv('YOUTUBE_API_KEY') ?: 'AIzaSyA2JNPQTSP3IqwFUiH5oPnWa4qIZaregGI';
if ($key === '') { http_response_code(503); echo json_encode(['error'=>'A pesquisa precisa de uma chave da YouTube Data API v3. Configure YOUTUBE_API_KEY no servidor. Você ainda pode abrir vídeos colando um link ou ID.']); exit; }
$url = 'https://www.googleapis.com/youtube/v3/search?' . http_build_query([
  'part'=>'snippet', 'type'=>'video', 'maxResults'=>25, 'q'=>$q, 'key'=>$key
]);
$ctx = stream_context_create(['http'=>['timeout'=>12, 'ignore_errors'=>true]]);
$response = @file_get_contents($url, false, $ctx);
if ($response === false) { http_response_code(502); echo json_encode(['error'=>'Não foi possível consultar a pesquisa agora.']); exit; }
$data = json_decode($response, true);
if (isset($data['error'])) { http_response_code(502); echo json_encode(['error'=>$data['error']['message'] ?? 'Erro na API.']); exit; }
$items = [];
foreach (($data['items'] ?? []) as $item) {
  $id = $item['id']['videoId'] ?? '';
  if (!$id) continue;
  $s = $item['snippet'] ?? [];
  $items[] = [
    'id'=>$id, 'title'=>$s['title'] ?? 'Vídeo sem título',
    'channel'=>$s['channelTitle'] ?? '',
    'thumbnail'=>$s['thumbnails']['high']['url'] ?? ($s['thumbnails']['medium']['url'] ?? ''),
    'publishedAt'=>$s['publishedAt'] ?? ''
  ];
}
echo json_encode(['items'=>$items], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);

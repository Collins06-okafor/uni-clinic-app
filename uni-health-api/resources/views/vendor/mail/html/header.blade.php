<tr>
<td class="header">
<a href="{{ $url }}" style="display: inline-block;">
@if (trim($slot) === 'Laravel')
{{-- Custom Logo - Hardcoded URL for testing --}}
<img src="http://127.0.0.1:8000/logo6.png" alt="{{ config('app.name') }}" style="height: 60px; width: auto; max-width: 200px;">
@else
{{ $slot }}
@endif
</a>
</td>
</tr>
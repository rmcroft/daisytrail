<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AppState extends Model
{
    protected $fillable = ['key', 'payload', 'revision', 'updated_by'];

    protected function casts(): array
    {
        return ['payload' => 'array'];
    }
}

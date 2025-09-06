while ($true) { 
    1..10000 | % { [math]::Sqrt($_) } 
}

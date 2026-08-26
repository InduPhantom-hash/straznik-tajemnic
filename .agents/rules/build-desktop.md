<RULE>
# Zawsze buduj aplikację desktopową po zmianach

Zawsze, gdy wprowadzisz zmiany w kodzie lub zasobach gry (w tym portrety postaci), bezwzględnie uruchom skrypt przebudowujący aplikację na potrzeby testów użytkownika na desktopie:
`bash desktop/build-app.sh --rebuild` w katalogu głównym projektu.

Zasada ta ma najwyższy priorytet. Użytkownik musi zawsze zobaczyć wprowadzone modyfikacje w lokalnej, natywnej aplikacji "Strażnik Tajemnic", inaczej jego testy ręczne nie wykażą zmian.
</RULE>

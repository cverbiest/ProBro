@ECHO OFF

echo Starting tests...

C:\Progress\OpenEdge\bin\prowin.exe -basekey "INI" -ininame propath.ini -pf C:\workspaces\dbs\SportsTest\sportsTest.pf -p ABLUnitCore.p -param  "CFG=./ablunit.json" 

findstr /m "</failure>" ..\results.xml > nul
if %errorlevel%==0 (
echo Seems there are failing tests...
)

echo Finished! Check 'results.xml'

pause
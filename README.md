### Groundwork Due Diligence Software 

Industrial properties are regulated by the EPA (Environmental Protection Agency). 
These properties are mandated to report the pollution into environment (air, water , land). Much of this data is sitting in EPA tables on the
internet over an API. This tool aggregates much of these data points into a useful dashboard with a pollution history 
of industrial properties so you don't have to search for these data along. 


### TECH STACK 
Frontend : React + Vite 
Backend : FastAPI 


### ------- HOW to RUN LOCALLY -------

Clone the repo to your local machine 

Backend Build : navigate to the directory where the code base is stored, to start the back end run these commands

cd /Users/neilgomes/Desktop/Groundwork -> 
source .venv/bin/activate -> 
uvicorn main:app --port 8000 

-----------------------------------------------------------------------------------------------------------------

Frontend Build : In a separate terminal within the same directory the code base is stored run these commands 

cd /Users/neilgomes/Desktop/Groundwork/frontend -> 
npm run dev

Leave both terminals open and running, logs will be present



 First time ever (setup): python3 -m venv .venv → pip install -r requirements.txt → then the run commands.

 Every time after that (just running it): source .venv/bin/activate → uvicorn main:app --port 8000 



